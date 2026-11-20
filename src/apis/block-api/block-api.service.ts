import { Injectable } from '@nestjs/common';
import { AddBlockDto } from '../../repositories/block-repo/dto/add.block.dto';
import { MuteRepoService } from '../../repositories/mute-repo/mute-repo.service';
import { PostRepoService } from '../../repositories/post-repo/post-repo.service';
import { AddMuteDto } from '../../repositories/mute-repo/dto/add.mute.dto';
import { BlockRepoService } from '../../repositories/block-repo/block-repo.service';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { UserRepoService } from '../../repositories/user-repo/user-repo.service';
import { AddBlockV2Dto } from '../../repositories/block-repo/dto/add.block.v2.dto';

@Injectable()
export class BlockApiService {
  constructor(
    private blockRepo: BlockRepoService,
    private postRepo: PostRepoService,
    private userRepo: UserRepoService,
  ) {}

  // async toggleBlock(body: AddBlockDto): Promise<boolean> {
  //   const thePost = await this.postRepo.getPostByLongHash(body.post_id, true);
  //   console.log(thePost);
  //   let result: boolean = false;
  //   if (thePost && thePost.id > 0) {
  //     result = await this.blockRepo.toggleBlock(
  //       body.user_id,
  //       thePost.user_id,
  //       //body.status,
  //     );
  //   }
  //
  //   return Promise.resolve(result);
  // }

  async toggleBlockByUserHash(
    userHash: AddBlockV2Dto,
    user: UserEntity,
  ): Promise<boolean> {
    let userToBlock: UserEntity;

    if (userHash?.h) {
      userToBlock = await this.userRepo.findUserByhash(userHash.h, 'USERID:');
    } else if (userHash?.u) {
      userToBlock = await this.userRepo.findByUsername(userHash.u);
    }

    let result = false;
    if (userToBlock && userToBlock.id > 0) {
      result = await this.blockRepo.toggleBlock(user.id, userToBlock.id);
    }

    return Promise.resolve(result);
  }

  async listBlockedUsers(user: UserEntity, pg): Promise<UserEntity[]> {
    const users = this.blockRepo.listBlockedUsers(user, pg);
    return Promise.resolve(users);
  }
}
