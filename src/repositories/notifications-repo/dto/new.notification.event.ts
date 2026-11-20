import { NotificationEnumTypes } from '../../types/notification.enum.types';
import { PostTypes } from '../../post-repo/entities/post.entity';

export class NewNotificationEvent {
  type: NotificationEnumTypes;
  user: number | string;
  fromUser?: number;
  post?: number | string;
  message?: string;
  postType?: PostTypes;
}
