import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { UserRepoService } from '../../repositories/user-repo/user-repo.service';
import { PostRepoService } from '../../repositories/post-repo/post-repo.service';

@Injectable()
export class SearchApiV2Service {
  constructor(
    private userRepoService: UserRepoService,
    private postRepo: PostRepoService,
  ) {}

  async searchLatest(q: string, user: UserEntity, pg: number) {
    const posts = await this.postRepo.searchPostText(q, pg, user);
    return Promise.resolve(posts);
  }

  async searchPostsWithImages(q: string, user: UserEntity, pg: number) {
    const posts = await this.postRepo.searchPostsWithImages(q, pg, user);
    return Promise.resolve(posts);
  }

  async searchPeople(q: string, user: UserEntity, pg: number, limit: number) {
    const posts = await this.userRepoService.searchPeople(q, pg, user, limit);
    return Promise.resolve(posts);
  }

  async searchTopPosts(q: string, user: UserEntity, pg: number) {
    const posts = await this.userRepoService.searchTopPost(q, pg, user);
    return Promise.resolve(posts);
  }
}
