import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { FollowRepoService } from 'src/repositories/follow-repo/follow-repo.service';
import { StreamRepoService } from 'src/repositories/stream-repo/stream-repo.service';
import { UserApiService } from '../user-api/user-api.service';
import { PostApiService } from '../post-api/post-api.service';
import { formStreamPostContent } from './helpers/form-stream-post-content';
import { PostTypes } from 'src/repositories/post-repo/entities/post.entity';

import { lastValueFrom, map } from 'rxjs';

require('dotenv').config();

const streamApiUrl = process.env.STREAM_API_URL;

@Injectable()
export class StreamApiService {
  constructor(
    private streamRepo: StreamRepoService,
    private followRepo: FollowRepoService,
    private http: HttpService,
    private readonly userService: UserApiService,
    private readonly postService: PostApiService,
  ) {}

  async getAllFollowing(
    userId: number,
    page: number,
    limit: number,
    isActive: boolean,
  ) {
    const followingCount = await this.followRepo.findFollowingCount(userId);

    if (!followingCount) {
      return [];
    }

    const following = await this.followRepo.findFollowing(
      userId,
      1,
      followingCount,
    );
    const followingIds = following.map(
      (followingData) => followingData.followed_user_id,
    );

    const followingStreams = await this.streamRepo.getAllByUsedIds(
      followingIds,
      page,
      limit,
      isActive,
    );

    const followingStreamsFormatted = Promise.all(
      followingStreams.map(async (stream) => {
        const userId = stream.user_id;
        const user = await this.userService
          .getUserRepo()
          .findOne(String(userId));

        return {
          ...stream,
          username: user.username,
        };
      }),
    );

    return followingStreamsFormatted;
  }

  async getFollowingCount(userId: number, isActive: boolean) {
    const followingCount = await this.followRepo.findFollowingCount(userId);

    if (!followingCount) {
      return 0;
    }

    const following = await this.followRepo.findFollowing(
      userId,
      1,
      followingCount,
    );
    const followingIds = following.map(
      (followingData) => followingData.followed_user_id,
    );

    return this.streamRepo.getCountByUserIds(followingIds, isActive);
  }

  async getOneByStreamId(streamId: string, isActive?: boolean) {
    const foundStream = await this.streamRepo.getOneByStreamId(
      streamId,
      isActive,
    );

    if (!foundStream) {
      throw new NotFoundException('Stream is not found');
    }

    return foundStream;
  }

  async addOne(streamId: string, userId: number) {
    const existingStream = await this.streamRepo.getOneByStreamId(
      streamId,
      true,
    );

    // if (existingStream) {
    //   throw new BadRequestException('Stream with such an id already exists');
    // }
    const playPath = `${streamApiUrl}/play.html?name=${streamId}`;
    const content = formStreamPostContent(playPath);
    const user = await this.userService.getUserRepo().findOne(String(userId));

    const streamPost = await this.postService.addPostv2(
      user,
      content,
      null,
      '0' as any,
      null,
      null,
      PostTypes.STREAM,
      null,
      null,
    );

    return await this.streamRepo.addOne(streamId, userId, streamPost.hash);
  }

  async finishOneByStreamId(streamId: string) {
    const existingStream = await this.getOneByStreamId(streamId, true);

    const { stream_id } = existingStream;
    // const { stream_id, user_id, post_hash } = existingStream;

    // const streamPost: any = await this.postService.postByHash(
    //   post_hash,
    //   false,
    //   true,
    // );

    // await this.postService.deleteUserPost(streamPost.id, user_id, streamPost);

    return this.streamRepo.finishOneByStreamId(stream_id);
  }

  async startRecording(streamId: string) {
    const url = process.env.STREAM_API_URL;
    const restUrl = 'rest/v2/broadcasts';

    const path = `${url}/${restUrl}/${streamId}/recording/true`;

    const result = await this.http.put(
      path,
      {},
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );
    const res = await lastValueFrom(result);
    console.log('Stream Record Result', JSON.stringify(res?.data));
  }
}
