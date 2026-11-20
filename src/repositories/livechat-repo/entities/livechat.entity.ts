import { BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('livechat')
export class LiveChatEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  user_id: number;

  @Column({ type: 'varchar' })
  stream_id: string;

  @Column({ type: 'integer', default: null })
  parent_id: number;

  @Column({ type: 'integer', default: 0 })
  count_likes: number;

  @Column({ type: 'text', default: null })
  comment: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated_at: Date;

  @Column({ type: 'varchar', length: 72, default: null })
  hash: string;

  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = new Date();
  }
}
