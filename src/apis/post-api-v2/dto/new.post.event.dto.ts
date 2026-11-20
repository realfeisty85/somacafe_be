import { PostEntity } from '../../../repositories/post-repo/entities/post.entity';
import { UserEntity } from '../../../repositories/user-repo/entities/user.entity';

export class NewPostEventDto {
  content: string;
  post: PostEntity;
  user: UserEntity;
  event: string;
  messageDetails?: any;
}
