import {
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// @Index('user_notify_UNIQ', ['user_id', 'from_user_id', 'post_id', 'type'], {
//   unique: true,
// })

@Entity('users_notify')
export class UsersNotifyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  @Index()
  user_id: number | string;

  @Column({ type: 'integer' })
  @Index()
  from_user_id: number | string;

  @Column({ type: 'integer' })
  @Index()
  post_id: number | string;

  @Column({ type: 'nvarchar', length: 255 })
  message: string;

  @Column({
    type: 'enum',
    enum: [
      'MENTTION',
      'SHARE',
      'LIKE',
      'REPLY',
      'FOLLOW',
      'MESSAGE',
      'QUOTE',
      'STREAM',
    ],
  })
  @Index()
  type: number;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @Column({ type: 'varchar', length: 75, default: null })
  room_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated_at: Date;
  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = new Date();
  }
}
