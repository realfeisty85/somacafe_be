import {
  BeforeUpdate,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as crypto from 'crypto';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  username: string;

  @Column({ type: 'varchar', length: 64 })
  displayName: string;
  @Column({ type: 'varchar', length: 64 })
  surname: string;
  @Column({ type: 'varchar', length: 64 })
  @Index({ unique: true })
  email: string;

  @Column({ type: 'text' })
  bio: string;

  @Column({ type: 'varchar', length: 450 })
  password: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  ava_src: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  profile_background_url: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updated_at: Date;

  @Column({ type: 'integer', default: 0 })
  followers_count: number;

  @Column({ type: 'integer', default: 0 })
  following_count: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  reset_token: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  reset_token_expires_at: Date;

  @Column({ type: 'timestamp', default: null })
  birthday: Date;

  @Column({ type: 'integer', default: 0 })
  isAdmin: number;

  @Column({ type: 'varchar', default: '', length: 96 })
  sessionId: string;

  @Column({ type: 'varchar', default: null, length: 72 })
  hash: string;

  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = new Date();
  }

  isAdminUser(): boolean {
    return this.isAdmin === 1;
  }

  getIdAsHash(hashedWith = 'USERID:'): string {
    // return crypto
    //   .createHash('md5')
    //   .update(`${hashedWith}${this.id}`)
    //   .digest('hex');
    return this.hash;
  }
}
