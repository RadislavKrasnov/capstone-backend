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

@Entity('analysis_configurations')
@Index('IDX_analysis_configurations_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_analysis_configurations_agency_id', ['agencyId'])
export class AnalysisConfiguration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'agency_id', type: 'int', nullable: true })
  agencyId?: number | null;

  @ManyToOne(() => Agency, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency?: Agency | null;

  @Column({ type: 'varchar', length: 255, default: 'Default configuration' })
  name: string;

  @Column({ name: 'min_target_margin_percent', type: 'numeric', precision: 6, scale: 2, default: 15 })
  minTargetMarginPercent: string;

  @Column({ name: 'good_margin_percent', type: 'numeric', precision: 6, scale: 2, default: 25 })
  goodMarginPercent: string;

  @Column({ name: 'max_daily_fatigue_score', type: 'int', default: 65 })
  maxDailyFatigueScore: number;

  @Column({ name: 'max_transfer_minutes_per_day', type: 'int', default: 180 })
  maxTransferMinutesPerDay: number;

  @Column({ name: 'min_buffer_minutes', type: 'int', default: 30 })
  minBufferMinutes: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
