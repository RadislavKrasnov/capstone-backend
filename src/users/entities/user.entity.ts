import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Agency } from '../../agencies/entities/agency.entity';

export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80 })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  refreshTokenHash?: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  phoneNumber?: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MANAGER,
  })
  role: UserRole;

  @Column({ name: 'agency_id', type: 'int' })
  agencyId: number;

  @ManyToOne(() => Agency, (agency) => agency.users, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
