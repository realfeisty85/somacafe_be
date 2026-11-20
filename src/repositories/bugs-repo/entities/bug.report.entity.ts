import {
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../user-repo/entities/user.entity';

@Entity('bugs_reports')
export class BugReportEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  @Index()
  user_id: number;

  @Column({ type: 'integer' })
  @Index()
  bugOption: number;

  @Column({ type: 'varchar', length: 500 })
  bugDescription: string;

  @Column({ type: 'varchar', length: 50 })
  system: string;

  @Column({ type: 'varchar', length: 50 })
  browser: string;

  @Column({ type: 'json', default: null })
  attachments: object;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;
}
