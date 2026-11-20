import {
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TokenTypes {
  FCM = '1',
}

@Entity('users_tokens')
export class UserTokensEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  @Index()
  user_id: number;

  @Column({ type: 'enum', enum: TokenTypes, default: TokenTypes.FCM })
  @Index()
  type: string;

  @Column({ type: 'varchar', length: 720 })
  value: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated_at: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = new Date();
  }
}
