import { Injectable } from '@nestjs/common';
import { AddFollowRequestDto } from '../../repositories/follow-repo/dto/add.follow.request.dto';
import { FollowRepoService } from '../../repositories/follow-repo/follow-repo.service';

@Injectable()
export class FollowApiService {
  constructor(private readonly followRepo: FollowRepoService) {}
  async followUser(body: AddFollowRequestDto) {
    console.log('FollowApiService - followUser');
    // console.log(body);
    await this.followRepo.followUser(body);
  }

  async isFollowing(body: AddFollowRequestDto): Promise<boolean> {
    console.log('FollowApiService - followUser');
    // console.log(body);
    return Promise.resolve(await this.followRepo.isFollowing(body));
  }
}
