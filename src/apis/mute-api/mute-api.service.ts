import { Injectable } from '@nestjs/common';
import { AddMuteDto } from '../../repositories/mute-repo/dto/add.mute.dto';
import { MuteRepoService } from '../../repositories/mute-repo/mute-repo.service';
import { PostRepoService } from '../../repositories/post-repo/post-repo.service';
import { UserRepoService } from '../../repositories/user-repo/user-repo.service';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { getManager } from 'typeorm';
import { AddMuteV2Dto } from '../../repositories/mute-repo/dto/add.mute.v2.dto';

const SEARCH_PAGE_SIZE = 20;

@Injectable()
export class MuteApiService {
  constructor(
    private muteRepo: MuteRepoService,
    private postRepo: PostRepoService,
    private userRepo: UserRepoService,
  ) {}
  async toggle(muteToggle: AddMuteV2Dto, user: UserEntity): Promise<boolean> {
    let userToMute;
    if (muteToggle?.u) {
      userToMute = await this.userRepo.findByUsername(muteToggle?.u);
    }
    if (muteToggle?.h) {
      userToMute = await this.userRepo.findUserByhash(muteToggle?.h, 'USERID:');
    }

    let result = false;
    if (user && user.id > 0 && userToMute) {
      // async toggleMute(userId: string, mutedUserId: string, status: number): Promise<boolean> {
      result = await this.userRepo.toggleMute(user.id, userToMute.id);
    }

    return Promise.resolve(result);
  }

  async listMutedUsers(user: UserEntity, pg: number) {
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
        '    inner join users_mute ub on u.id = ub.muted_user_id and ub.status=1' +
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
