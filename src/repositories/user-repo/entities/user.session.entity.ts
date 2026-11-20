import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users_session')
export class UserSessionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  @Index({ unique: true })
  user_id: number;

  @Column({ type: 'varchar', default: '', length: 96 })
  @Index()
  session_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
