import {
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('polls')
export class PollEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  @Index()
  user_id: number | string;

  @Column({ type: 'smallint', default: 1 })
  isActive: number;

  @Column({ type: 'text', default: null })
  question: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public expire_at: any;

  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = new Date();
  }
}
