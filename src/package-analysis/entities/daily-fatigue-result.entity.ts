import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { FatigueLevel } from '../../common/enums/fatigue-level.enum';
import { TourDay } from '../../itinerary/entities/tour-day.entity';
import { PackageAnalysisRun } from './package-analysis-run.entity';

@Entity('daily_fatigue_results')
@Index('IDX_daily_fatigue_results_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_daily_fatigue_results_analysis_run_id', ['analysisRunId'])
@Index('IDX_daily_fatigue_results_day_id', ['dayId'])
@Index('IDX_daily_fatigue_results_analysis_run_id_day_id_unique', ['analysisRunId', 'dayId'], {
  unique: true,
})
export class DailyFatigueResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'analysis_run_id', type: 'int' })
  analysisRunId: number;

  @ManyToOne(() => PackageAnalysisRun, (analysisRun) => analysisRun.dailyFatigueResults, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_run_id' })
  analysisRun: PackageAnalysisRun;

  @Column({ name: 'day_id', type: 'int' })
  dayId: number;

  @ManyToOne(() => TourDay, (day) => day.fatigueResults, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'day_id' })
  day: TourDay;

  @Column({ name: 'activity_load', type: 'numeric', precision: 6, scale: 2 })
  activityLoad: string;

  @Column({ name: 'transfer_load', type: 'numeric', precision: 6, scale: 2 })
  transferLoad: string;

  @Column({ name: 'intensity_load', type: 'numeric', precision: 6, scale: 2 })
  intensityLoad: string;

  @Column({ name: 'compression_penalty', type: 'numeric', precision: 6, scale: 2 })
  compressionPenalty: string;

  @Column({ name: 'rest_credit', type: 'numeric', precision: 6, scale: 2 })
  restCredit: string;

  @Column({ name: 'fatigue_score', type: 'int' })
  fatigueScore: number;

  @Column({ name: 'balance_score', type: 'int' })
  balanceScore: number;

  @Column({
    name: 'fatigue_level',
    type: 'enum',
    enum: FatigueLevel,
    enumName: 'daily_fatigue_results_fatigue_level_enum',
  })
  fatigueLevel: FatigueLevel;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  reasons: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
