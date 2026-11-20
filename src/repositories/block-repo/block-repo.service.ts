import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getManager, Repository } from 'typeorm';
import { UserRepoService } from '../user-repo/user-repo.service';
import { BlockEntity } from './entities/block.entity';
import { MuteEntity } from '../mute-repo/entities/mute.entity';
import { UserEntity } from '../user-repo/entities/user.entity';
import { PostEntity } from '../post-repo/entities/post.entity';

const SEARCH_PAGE_SIZE = 20;

@Injectable()
export class BlockRepoService {
  constructor(
    @InjectRepository(BlockEntity)
    private blockRepository: Repository<BlockEntity>,
  ) {}

  async toggleBlock(
    userId: number,
    blockedUserId: number | string,
  ): Promise<any> {
    try {
      const existingBlocked: BlockEntity = await this.blockRepository.findOne({
        where: { user_id: userId, blocked_user_id: blockedUserId },
      });
      let message = 'Blocked User';
      if (existingBlocked && existingBlocked.id > 0) {
        existingBlocked.status = existingBlocked.status === 1 ? 0 : 1;
        await this.blockRepository.save(existingBlocked);
        if (existingBlocked.status === 0) {
          message = 'Unblocked User';
        }
      } else {
        const newBlock = new BlockEntity();
        newBlock.user_id = userId;
        newBlock.blocked_user_id = blockedUserId;
        newBlock.status = 1;
        await this.blockRepository.save(newBlock);
      }

      return Promise.resolve({ result: true, message });
    } catch (e) {
      console.log('Error saving mute action');
      console.log(e);
    }
    return Promise.resolve({ result: false });
  }

  async find(options): Promise<BlockEntity[]> {
    return await this.blockRepository.find(options);
  }

  async remove(entry: BlockEntity) {
    console.log('removing blocked entry');
    console.log(entry);
    return await this.blockRepository.delete(entry.id);
  }

  async getBlockedByUser(
    siteUserId: number,
    user_id: number | string,
  ): Promise<BlockEntity> {
    const isBlock: BlockEntity = await this.blockRepository.findOne({
      where: {
        user_id: siteUserId,
        blocked_user_id: user_id,
      },
    });
    return Promise.resolve(isBlock);
  }

  async listBlockedUsers(user: UserEntity, pg: number): Promise<UserEntity[]> {
    if (!pg || pg === 0) {
      pg = 1;
    }

    const entityManager = getManager();
    const users: UserEntity[] = await entityManager.query(
      '    select ' +
        '    u.id, ' +
        '      u.username, ' +
        '      u.displayName, ' +
        '      u.bio, ' +
        '      u.isActive, ' +
        '      u.created_at, ' +
        '      u.ava_src, ' +
        '      u.followers_count, ' +
        '      u.following_count, ' +
        '      u.profile_background_url, ' +
        '      u.birthday ' +
        '    from users u ' +
        '    inner join users_block ub on u.id = ub.blocked_user_id and ub.status=1' +
        '    where ub.user_id = ? limit ?, ? ',
      [user.id, (pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
    );
    const uu: UserEntity = new UserEntity();
    await Promise.all(
      users.map((u) => {
        uu.id = u.id;
        u['user_id'] = uu.getIdAsHash();
        delete u['id'];
        return;
      }),
    );
    return Promise.resolve(users);
  }
}
