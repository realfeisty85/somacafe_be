import {
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as crypto from 'crypto';

export enum PostTypes {
  POST = 'post',
  REPLY = 'reply',
  QUOTE = 'quote',
  SHARE = 'share',
  COMMENT = 'comment',
  POLL = 'poll',
  STREAM = 'stream',
}

export enum ContentTypes {
  TEXT = 'text',
}

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn()
  id: number | string;

  @Column({ type: 'integer' })
  @Index()
  user_id: number | string;

  @Column({ type: 'integer', default: null })
  @Index()
  parent_post_id: number | string;

  @Column({ type: 'integer', default: null })
  @Index()
  poll_id: number;

  @Column({ type: 'enum', enum: PostTypes, default: PostTypes.POST })
  @Index()
  postType: number | string;

  @Column({ type: 'enum', enum: ContentTypes, default: ContentTypes.TEXT })
  @Index()
  contentType: number;

  @Column({ type: 'smallint', default: 1 })
  canReply: number | boolean;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @Column({ type: 'smallint', default: 1 })
  privacy: number;

  @Column({ type: 'integer', default: 0 })
  count_likes: number;

  @Column({ type: 'integer', default: 0 })
  count_share: number;

  @Column({ type: 'longtext', default: null })
  post: string;

  @Column({ type: 'longtext', default: null })
  gallery: string;

  @Column({ type: 'varchar', length: 255, default: null })
  gif: string;

  @Column({ type: 'longtext', default: null })
  mentions: string;

  @Column({ type: 'longtext', default: null })
  links_meta: string;

  @Column({ type: 'varchar', length: 72, default: null })
  @Index()
  hash: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated_at: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = new Date();
  }

  getIdAsHash(hashedWith = 'POSTID:'): string {
    return this.hash;
    // return `${crypto
    //   .createHash('md5')
    //   .update(`${hashedWith}${this.id}`)
    //   .digest('hex')}-${this.postType === 'poll' ? 2 : 1}`;
  }
}
