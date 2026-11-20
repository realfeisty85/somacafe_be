import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('streams')
export class StreamEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  stream_id: string;

  @Column({ type: 'integer' })
  user_id: number;

  @Column({ type: 'varchar' })
  post_hash: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;
}
