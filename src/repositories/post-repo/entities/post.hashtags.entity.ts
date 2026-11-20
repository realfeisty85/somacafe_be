import {
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('posts_hashtags')
export class PostHashtagsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  @Index()
  user_id: number | string;

  @Column({ type: 'smallint', default: 0 })
  is_trending: number;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  tag: string;

  @Column({ type: 'integer' })
  popularity: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  public trending_at: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = new Date();
  }
}
