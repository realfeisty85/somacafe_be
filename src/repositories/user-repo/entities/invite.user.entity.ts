import {
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users_invites')
export class InviteUserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  invite_code: string;

  @Column({ type: 'varchar', length: 96, default: null })
  friend_name: string;

  @Column({ type: 'varchar', length: 128, default: null })
  friend_email: string;

  @Column({ type: 'integer', default: 0 })
  @Index()
  invitor_user_id: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated_at: Date;

  @Column({ type: 'timestamp', default: null })
  public expires_at: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = new Date();
  }
}
