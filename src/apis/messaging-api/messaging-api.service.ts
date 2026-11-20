import { Inject, Injectable } from '@nestjs/common';
import * as rethink from 'rethinkdb';
import { v4 as uuid } from 'uuid';
import { NewChatDto } from './dto/new.chat.dto';
import { NewChatRoomDto } from './dto/new.chat.room.dto';
import { NewMessageDto } from './dto/new.message.dto';
import * as moment from 'moment';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { UserApiService } from '../user-api/user-api.service';
import { NewPostEventDto } from '../post-api-v2/dto/new.post.event.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostTempImageEntity } from '../../repositories/post-repo/entities/post.temp.image.entity';

const MESSAGEDB = 'somaMsg';

@Injectable()
export class MessagingApiService {
  private connection: rethink.Connection;

  constructor(
    @Inject('RethinkdbProvider') connection,
    private readonly userApi: UserApiService,
    private eventEmitter: EventEmitter2,
  ) {
    this.connection = connection;
  }

  async listChats(webUser: UserEntity): Promise<any> {
    const result = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter(
        rethink
          .row('hidden')
          .eq(false)
          .and(
            rethink
              .row('creator')
              .eq(webUser.hash)
              .or(rethink.row('users').contains(webUser.hash)),
          ),
      )
      .orderBy(rethink.desc('updatedAt'))
      // .withFields('id', 'createdAt', 'topic', 'creator', 'users')
      .run(this.connection)
      .then((cursor) => {
        const lst: any = cursor.toArray();
        return lst.map(async (rm) => {
          rm['unreadCount'] = await this.countUnread(rm['id'], webUser.hash);
          rm['isPublic'] = rm['users'].length > 1;

          if (!rm['topic']) {
            if (rm['users'].length > 1) {
              const usr1 = await this.getUserProfileByhash(rm['creator'], null);
              const usr2 = await this.getUserProfileByhash(
                rm['users'][0],
                null,
              );
              const usr3 = await this.getUserProfileByhash(
                rm['users'][1],
                null,
              );
              rm[
                'topic'
              ] = `${usr2.displayName}, ${usr3.displayName}, ${usr1.username}`;
            }
          }

          const otherProfileId = rm['users'].pop();

          const lastMsg = await this.getRoomLastMessage(rm['id']);
          let creator;
          if (otherProfileId && webUser.hash !== otherProfileId) {
            creator = await this.getUserProfileByhash(otherProfileId, webUser);
          } else {
            creator = await this.getUserProfileByhash(rm['creator'], webUser);
          }

          delete rm['users'];

          if (creator) {
            rm['topicUsername'] = creator['displayName'];
            if (rm['isPublic'] === false) {
              rm['image'] = creator['ava_src'];
            }

            //rm['updatedAt'] = moment(rm['createdAt']).unix();
            if (lastMsg) {
              //rm['updatedAt'] = lastMsg['createdAt'];
              rm['lastMessage'] = lastMsg['msg'];
            }

            delete rm['creator'];
          }

          rm['unread'] = await this.isRoomUnread(rm?.id, webUser.hash);
          return rm;
        });
      });

    return Promise.resolve(result);
  }

  async isRoomUnread(id: string, user: string): Promise<boolean> {
    const unreads = await rethink
      .db(MESSAGEDB)
      .table('roomStatus')
      .get(`${id}${user}`)
      .run(this.connection);

    if (unreads) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  async addChatRoom(newChat: NewChatRoomDto): Promise<any> {
    const chat = {
      id: uuid(),
      creator: newChat.userId,
      topic: newChat.roomName,
      crc: newChat.crc,
      status: 'Active',
      isPublic: false,
      users: newChat.users,
      createdAt: new Date().toISOString(),
      updatedAt: moment().unix(),
      hidden: false,
    };

    const resultRoom = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter(
        rethink
          .row('crc')
          .eq(newChat.crc)
          .and(rethink.row('creator').eq(newChat.userId)),
      )
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });

    if (resultRoom && resultRoom.length > 0) {
      const foundRoom = resultRoom[0];
      if (foundRoom['creator'] === newChat.userId) {
        await rethink
          .db(MESSAGEDB)
          .table('chats')
          .filter(rethink.row('id').eq(foundRoom.id))
          .update({ updatedAt: moment().unix(), hidden: false })
          .run(this.connection);
      }

      await rethink
        .db(MESSAGEDB)
        .table('chats')
        .filter(rethink.row('id').eq(foundRoom.id))
        .update({ updatedAt: moment().unix(), users: newChat.users })
        .run(this.connection);

      const room = await this.getRoomById(foundRoom.id);
      if (room && room.length === 1) {
        return room[0];
      }
    }

    const resAdd = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .insert(chat)
      .run(this.connection)
      .then((cursor) => {
        return cursor;
      });

    return chat;
  }

  async countUnread(roomId, userId): Promise<number> {
    const result = await rethink
      .db(MESSAGEDB)
      .table('chatMsg')
      .filter(
        rethink
          .row('roomId')
          .eq(roomId)
          .and(rethink.row('unread').contains(userId)),
      )
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });

    return Promise.resolve(result.length);
  }

  async sendMessage(newMessage: NewMessageDto): Promise<any> {
    newMessage.id = uuid();
    newMessage.createdAt = moment().unix();
    newMessage['sentAt'] = moment.unix(newMessage.createdAt).toISOString();

    const resultRoom = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter(
        rethink
          .row('id')
          .eq(newMessage.roomId)
          .and(
            rethink
              .row('creator')
              .eq(newMessage.from)
              .or(rethink.row('users').contains(newMessage.from)),
          ),
      )
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });

    if (resultRoom.length === 1) {
      const newEvent = new NewPostEventDto();
      newEvent.event = 'message.new';
      newEvent.messageDetails = {
        message: newMessage,
        room: resultRoom[0],
      };

      this.eventEmitter.emit('message.new', newEvent);

      const unreadList = [
        resultRoom[0]['creator'],
        ...resultRoom[0]['users'],
      ].filter((u) => u !== newMessage.from);
      newMessage['unread'] = unreadList;

      const resp = await new Promise((resolve, reject) => {
        rethink
          .db(MESSAGEDB)
          .table('chatMsg')
          .insert(newMessage)
          .run(this.connection, (err, result) => {
            if (err) {
              console.log(err);
              reject(err);
            }
            resolve(newMessage);
          });
      });

      await this.tagRoomNewMessage(resultRoom, newMessage);

      return resp;
    } else {
      throw new Error('Access denied');
    }
  }

  async tagRoomNewMessage(resultRoom: any, newMessage: NewMessageDto) {
    const room = resultRoom[0];

    await rethink
      .db(MESSAGEDB)
      .table('roomStatus')
      .insert(
        [...room.users, room.creator].map((u) => {
          return {
            id: `${room.id}${u}`,
            roomId: room.id,
            user: u,
            unread: true,
            updated: moment().toISOString(),
          };
        }),
        { conflict: 'replace' },
      )
      .run(this.connection);

    await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter({ id: room.id })
      .update({ updatedAt: moment().unix() })
      .run(this.connection);
  }

  async readMessages(
    roomId: string,
    readerId: string,
    page: number,
    pageSize: number,
    cursor?,
  ): Promise<any> {
    const resultRoom = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter({ id: roomId })
      .filter(
        rethink
          .row('creator')
          .eq(readerId)
          .or(rethink.row('users').contains(readerId)),
      )
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });

    if (resultRoom.length > 0) {
      let result;
      if (!cursor) {
        result = await rethink
          .db(MESSAGEDB)
          .table('chatMsg')
          .filter(rethink.row('roomId').eq(roomId))
          .orderBy(rethink.desc('createdAt'))
          .slice((page - 1) * pageSize, page * pageSize)
          .run(this.connection)
          .then((cursor) => {
            const arr: any = cursor.toArray();
            arr.map((m) => {
              m['mine'] = m['from'] === readerId;
              if (m['mine']) {
                m['seen'] =
                  m['unread']?.filter((u) => m['from'] !== u).length === 0;
              }
            });
            return arr;
          });
      } else {
        result = await rethink
          .db(MESSAGEDB)
          .table('chatMsg')
          .filter(
            rethink
              .row('roomId')
              .eq(roomId)
              .and(
                rethink
                  .row('createdAt')
                  .gt(parseInt(cursor))
                  .or(rethink.row('createdAt').eq(parseInt(cursor))),
              ),
          )
          .orderBy(rethink.desc('createdAt'))
          .slice((page - 1) * pageSize, page * pageSize)
          .run(this.connection)
          .then((cursor) => {
            const arr: any = cursor.toArray();
            arr.map((m) => {
              m['mine'] = m['from'] === readerId;
            });
            return arr;
          });
      }

      result = await Promise.all(
        result.map(async (m) => {
          m['user'] = await this.getUserTag(m['from']);
          return m;
        }),
      );

      await rethink
        .db(MESSAGEDB)
        .table('roomStatus')
        .get(`${roomId}${readerId}`)
        .delete()
        .run(this.connection);

      return Promise.resolve(result.reverse());
    }
  }

  async setup(): Promise<boolean> {
    try {
      const dbName = 'somaMsg';
      const tables = ['chatMsg', 'chatUser', 'chats', 'roomStatus'];

      const currentDbs = await rethink.dbList().run(this.connection);

      if (currentDbs.indexOf(dbName) > -1) {
      } else {
        const res = await rethink.dbCreate(dbName).run(this.connection);
      }

      const tablez = await rethink.db(dbName).tableList().run(this.connection);

      await Promise.all(
        tables.map(async (t) => {
          if (tablez.indexOf(t) < 0) {
            await rethink.db(dbName).tableCreate(t).run(this.connection);
          }
        }),
      );
      return Promise.resolve(true);
    } catch (e) {
      console.log(e);
    }
    return Promise.resolve(false);
  }

  async resetDb() {
    const dbName = 'somaMsg';
    const tables = ['chatMsg', 'chatUser', 'chats', 'roomStatus'];

    const tablez = await rethink.db(dbName).tableList().run(this.connection);

    await Promise.all(
      tablez.map(async (t) => {
        await rethink.db(dbName).table(t).delete().run(this.connection);
      }),
    );

    return Promise.resolve(await this.setup());
  }

  async removeUser(
    user: UserEntity,
    roomHash: string,
    usr: string,
  ): Promise<boolean> {
    const room = await this.getRoomById(roomHash);
    let res = false;
    if (room && room.length === 1) {
      if (room[0]['creator'] === user.getIdAsHash()) {
        res = await this.removeUserFromRoom(room[0]['id'], usr);
      }
    }

    return Promise.resolve(res);
  }

  async leaveRoom(user: UserEntity, roomHash: string): Promise<boolean> {
    try {
      const room = await this.getRoomById(roomHash);
      let res = false;
      if (room && room.length === 1) {
        res = await this.removeUserFromRoom(room[0]['id'], user.hash);
      }

      return Promise.resolve(res);
    } catch (e) {
      console.log(e);
    }
    console.log('Error with leave room');
    return Promise.resolve(false);
  }

  async hideRoom(user: UserEntity, roomHash: string): Promise<boolean> {
    try {
      const room = await this.getRoomById(roomHash);
      let res = false;
      if (room && room.length === 1) {
        const rm = room[0];
        if (rm?.creator === user.hash) {
          res = await this.setRoomHiddenForCreator(rm);
        }
        if (rm?.users.indexOf(user.hash) > -1) {
          res = await this.leaveRoom(user, roomHash);
        }
      }
      return Promise.resolve(res);
    } catch (e) {
      console.log(e);
    }
    console.log('Error with leave room');
    return Promise.resolve(false);
  }

  async setRoomHiddenForCreator(rm): Promise<any> {
    const res = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter(rethink.row('id').eq(rm?.id))
      .update({ hidden: true })
      .run(this.connection);

    return Promise.resolve(res);
  }

  private async getRoomById(roomHash: string) {
    const result = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter(rethink.row('id').eq(roomHash))
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });

    return result;
  }

  private async removeUserFromRoom(
    roomHash: string,
    usr: string,
  ): Promise<boolean> {
    const room = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter(rethink.row('id').eq(roomHash))
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });
    if (room && room.length === 1) {
      if (room[0]['users'].indexOf(usr) > -1) {
        const newUsersList = room[0]['users'].filter((u) => u !== usr);
        const res = await rethink
          .db(MESSAGEDB)
          .table('chats')
          .filter(rethink.row('id').eq(roomHash))
          .update({ users: newUsersList })
          .run(this.connection);
        return Promise.resolve(true);
      }
    }
    return Promise.resolve(false);
  }

  async addUser(
    user: UserEntity,
    roomHash: string,
    usr: string,
  ): Promise<boolean> {
    const room = await this.getRoomById(roomHash);
    let res = false;
    if (room && room.length === 1) {
      if (room[0]['creator'] === user.getIdAsHash()) {
        res = await this.addUserToRoom(room[0]['id'], usr);
      }
    }
    return Promise.resolve(res);
  }

  private async addUserToRoom(roomHash: any, usr: string): Promise<boolean> {
    const room = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter(rethink.row('id').eq(roomHash))
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });
    if (room && room.length === 1) {
      if (room[0]['users'].indexOf(usr) < 0) {
        const newUsersList = [...room[0]['users'], usr];
        const res = await rethink
          .db(MESSAGEDB)
          .table('chats')
          .filter(rethink.row('id').eq(roomHash))
          .update({ users: newUsersList })
          .run(this.connection);

        return Promise.resolve(true);
      }
    }
    return Promise.resolve(false);
  }

  async getRoomInfo(roomHash: string, siteUser: UserEntity): Promise<string[]> {
    const room = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter(rethink.row('id').eq(roomHash))
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });

    if (room && room.length === 1) {
      //      let msg = await this.getRoomLastMessage(roomHash);
      // mmsg['user'] = await this.getUserProfileByhash(msg['from']);

      const thisRoom = room.pop();

      if (
        thisRoom['creator'] === siteUser.getIdAsHash() ||
        thisRoom['users'].indexOf(siteUser.getIdAsHash()) > -1
      ) {
        delete thisRoom['createdAt'];
        delete thisRoom['status'];

        const creatorInfo = await this.getUserProfileByhash(
          thisRoom['creator'],
          siteUser,
        );

        delete creatorInfo['profile_background_url'];

        await this.markRoomMessagesAsRead(thisRoom, siteUser);

        //thisRoom['lastMessage'] = mmsg;
        thisRoom['isPublic'] = thisRoom['users'].length > 1;

        thisRoom['siteUser'] = siteUser.getIdAsHash();
        let topicUser;

        if (thisRoom['isPublic'] === false) {
          if (
            thisRoom['siteUser'] === thisRoom['creator'] &&
            thisRoom['users'].length === 1
          ) {
            topicUser = await this.getUserProfileByhash(
              thisRoom['users'][0],
              siteUser,
            );
          } else {
            topicUser = await this.getUserProfileByhash(
              thisRoom['creator'],
              siteUser,
            );
          }
          thisRoom['title'] = topicUser['username'];
        } else {
          const sampleUsers = await Promise.all(
            [...thisRoom['users'].slice(0, 10), thisRoom['creator']].map(
              async (u) => {
                return (await this.getUserProfileByhash(u, siteUser))[
                  'displayName'
                ];
              },
            ),
          );
          thisRoom['title'] = null;
          if (sampleUsers) {
            thisRoom['title'] = sampleUsers.join(', ');
          }
        }
        if (topicUser && topicUser['ava_src']) {
          thisRoom['image'] = topicUser['ava_src'];
          delete topicUser['ava_src'];
        }
        if (topicUser && topicUser['profile_background_url']) {
          delete topicUser['profile_background_url'];
        }
        thisRoom['user'] = topicUser;

        delete thisRoom['topic'];

        const creatorProf = await this.getUserProfileByhash(
          thisRoom['creator'],
          siteUser,
        );
        const {
          displayName,
          ava_src,
          username,
          created_at,
          followers_count,
          following_count,
        } = creatorProf;
        thisRoom['user'] = {
          userId: thisRoom['creator'],
          displayName,
          ava_src,
          username,
          joined: created_at,
          followers_count,
          following_count,
        };
        delete thisRoom['creator'];
        delete thisRoom['isPublic'];
        delete thisRoom['siteUser'];
        const users = await Promise.all(
          thisRoom['users'].map(async (u) => {
            const prof = await this.getUserProfileByhash(u, siteUser);
            return prof;
            const { displayName, ava_src } = prof;
            return { userId: u, displayName, ava_src };
          }),
        );
        thisRoom['users'] = users;
        thisRoom['unread'] = await this.isRoomUnread(
          thisRoom?.id,
          siteUser.hash,
        );
        return Promise.resolve(thisRoom);
      }
    }
    return Promise.resolve(null);
  }

  async getRoomLastMessage(roomHash: string): Promise<any> {
    let msg = await rethink
      .db(MESSAGEDB)
      .table('chatMsg')
      .filter(rethink.row('roomId').eq(roomHash))
      .orderBy(rethink.desc('createdAt'))
      .limit(1)
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });
    if (msg.length === 1) {
      msg = msg.pop();
      return Promise.resolve(msg);
    }
    return Promise.resolve(null);
  }

  async getUserProfileByhash(userHash: string, siteUser): Promise<any> {
    const creatorInfo = await this.userApi.getProfileByUserHash(
      {
        userHash,
      },
      true,
      siteUser,
    );

    if (creatorInfo) {
      return Promise.resolve(creatorInfo);
      const {
        username,
        displayName,
        created_at,
        ava_src,
        followers_count,
        following_count,
        profile_background_url,
      } = creatorInfo;

      return Promise.resolve({
        username,
        displayName,
        created_at,
        ava_src,
        followers_count,
        following_count,
        profile_background_url,
      });
    }
  }

  async searchUsers(user: UserEntity, userName: string): Promise<any> {
    const found = await this.userApi.searchUsers(user, userName);

    return Promise.resolve(found);
  }

  async getUserTag(userHash): Promise<any> {
    const user = await this.userApi.getProfileByUserHash({
      userHash: userHash,
    });
    if (user) {
      return {
        name: user.displayName,
        img: user.ava_src,
        username: user.username,
      };
    }
    return {};
  }

  async editMessage(
    user: UserEntity,
    messageId: string,
    messageText: string,
  ): Promise<any> {
    const message = await this.loadMessage(messageId);
    if (message && message['from'] && message['from'] === user.getIdAsHash()) {
      message['msg'] = messageText;
      const m = await this.saveMessage(messageId, message);
      return Promise.resolve(m);
    }
    return Promise.resolve(null);
  }

  private async loadMessage(messgeId: string): Promise<any> {
    const msg = await rethink
      .db(MESSAGEDB)
      .table('chatMsg')
      .filter(rethink.row('id').eq(messgeId))
      .limit(1)
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });

    if (msg.length === 1) {
      return Promise.resolve(msg[0]);
    }

    return Promise.resolve(null);
  }

  private async saveMessage(messageId: string, message: any): Promise<any> {
    const msg = await rethink
      .db(MESSAGEDB)
      .table('chatMsg')
      .filter(rethink.row('id').eq(messageId))
      .update({ msg: message['msg'] })
      .run(this.connection);

    if (msg.replaced === 1) {
      return Promise.resolve(message);
    }

    return Promise.resolve(null);
  }

  async delMessage(user: UserEntity, messageId: string): Promise<boolean> {
    const message = await this.loadMessage(messageId);
    if (message && message['from'] && message['from'] === user.getIdAsHash()) {
      const msg = await rethink
        .db(MESSAGEDB)
        .table('chatMsg')
        .filter(
          rethink
            .row('id')
            .eq(messageId)
            .and(rethink.row('from').eq(user.getIdAsHash())),
        )
        .delete()
        .run(this.connection);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  async getUnreadCount(user: UserEntity): Promise<number> {
    const resultRooms = await (
      await rethink
        .db(MESSAGEDB)
        .table('chats')
        .filter(
          rethink
            .row('hidden')
            .eq(false)
            .and(
              rethink
                .row('creator')
                .eq(user.hash)
                .or(rethink.row('users').contains(user.hash)),
            ),
        )
        .run(this.connection)
        .then((c) => {
          return c.toArray();
        })
    ).map((r) => r.id);

    const count = await rethink
      .db(MESSAGEDB)
      .table('chatMsg')
      .filter(function (msg: any) {
        return rethink
          .expr(resultRooms)
          .contains(msg('roomId'))
          .and(msg('unread').contains(user.hash));
      })
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });
    return Promise.resolve(count.length);
  }

  private async markRoomMessagesAsRead(thisRoom: any, siteUser: UserEntity) {
    const unread: any[] = await rethink
      .db(MESSAGEDB)
      .table('chatMsg')
      .filter(rethink.row('unread').contains(siteUser.hash))
      .run(this.connection)
      .then((cursor) => {
        return cursor.toArray();
      });

    await Promise.all(
      unread.map(async (m) => {
        const unreadLsit = m['unread'].filter((u) => u !== siteUser.hash);
        let readList = m['read'];
        if (readList) {
          readList = [...readList, siteUser.hash];
        } else {
          readList = [siteUser.hash];
        }
        m['read'] = readList;
        await rethink
          .db(MESSAGEDB)
          .table('chatMsg')
          .filter(rethink.row('id').eq(m['id']))
          .update({ unread: unreadLsit, read: m['read'] })
          .run(this.connection);
      }),
    );
  }

  async countNewMessages(user: UserEntity): Promise<any> {
    const resultRooms = await (
      await rethink
        .db(MESSAGEDB)
        .table('chats')
        .filter(
          rethink
            .row('hidden')
            .eq(false)
            .and(
              rethink
                .row('creator')
                .eq(user.hash)
                .or(rethink.row('users').contains(user.hash)),
            ),
        )
        .run(this.connection)
        .then((c) => {
          return c.toArray();
        })
    ).map((r) => r.id);

    const result = await rethink
      .db(MESSAGEDB)
      .table('roomStatus')
      .filter(function (room: any) {
        const roomId = room('roomId');
        return rethink
          .expr(resultRooms)
          .contains(roomId)
          .and(room('unread').eq(true).and(room('user').eq(user.hash)));
      })
      .withFields('id')
      .run(this.connection)
      .then((c) => c.toArray());

    return Promise.resolve(result.length);
  }

  async renameRoom(roomHash: string, newName: string): Promise<boolean> {
    const res = await rethink
      .db(MESSAGEDB)
      .table('chats')
      .filter(rethink.row('id').eq(roomHash))
      .update({ topic: newName })
      .run(this.connection);

    return Promise.resolve(res?.replaced === 1);
  }
}
