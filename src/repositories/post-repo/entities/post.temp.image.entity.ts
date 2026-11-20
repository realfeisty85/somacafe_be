import {
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('posts_temp_images')
export class PostTempImageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  @Index()
  user_id: number | string;

  @Column({ type: 'varchar', length: 64, default: '' })
  @Index()
  temp_hash: string;

  @Column({ type: 'varchar' })
  image_path: string;

  @Column({ type: 'integer', default: null })
  @Index()
  post_id: number | string;

  @Column({ type: 'boolean', default: false })
  isVideo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated_at: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = new Date();
  }
}
