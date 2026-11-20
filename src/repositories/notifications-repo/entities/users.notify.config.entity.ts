import {
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users_notify_config')
export class UsersNotifyConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  @Index()
  user_id: number | string;

  @Column({ type: 'smallint', default: 1 })
  mentions: number;

  @Column({ type: 'smallint', default: 1 })
  shares: number;

  @Column({ type: 'smallint', default: 1 })
  likes: number;

  @Column({ type: 'smallint', default: 1 })
  replies: number;

  @Column({ type: 'smallint', default: 1 })
  follower: number;

  @Column({ type: 'smallint', default: 1 })
  messages: number;

  @Column({ type: 'smallint', default: 1 })
  quotes: number;

  @Column({ type: 'smallint', default: 1 })
  streamer: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated_at: Date;
  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = new Date();
  }
}
