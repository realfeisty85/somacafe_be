import { BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('livechat_block_list')
export class LiveChatBlockListEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  user_id: number;

  @Column({ type: 'integer' })
  blocked_user_id: number;

  @Column({ type: 'varchar' })
  stream_id: string;

  @Column({ type: 'boolean', default: false })
  is_owner: boolean;

  @Column({ type: 'boolean', default: true })
  status: boolean;

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
