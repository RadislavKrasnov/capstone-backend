import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';

import { RecommendationCategory } from '../../common/enums/recommendation-category.enum';
import { RecommendationSeverity } from '../../common/enums/recommendation-severity.enum';
import { ItineraryItem } from '../../itinerary/entities/itinerary-item.entity';
import { TourDay } from '../../itinerary/entities/tour-day.entity';
import { PackageAnalysisRun } from './package-analysis-run.entity';

@Entity('generated_recommendations')
@Index('IDX_generated_recommendations_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_generated_recommendations_analysis_run_id', ['analysisRunId'])
@Index('IDX_generated_recommendations_severity', ['severity'])
@Index('IDX_generated_recommendations_affected_day_id', ['affectedDayId'])
@Index('IDX_generated_recommendations_affected_item_id', ['affectedItemId'])
export class GeneratedRecommendation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'analysis_run_id', type: 'int' })
  analysisRunId: number;

  @ManyToOne(() => PackageAnalysisRun, (analysisRun) => analysisRun.recommendations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_run_id' })
  analysisRun: PackageAnalysisRun;

  @Column({ name: 'rule_code', type: 'varchar', length: 100 })
  ruleCode: string;

  @Column({
    type: 'enum',
    enum: RecommendationCategory,
    enumName: 'generated_recommendations_category_enum',
  })
  category: RecommendationCategory;

  @Column({
    type: 'enum',
    enum: RecommendationSeverity,
    enumName: 'generated_recommendations_severity_enum',
  })
  severity: RecommendationSeverity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  explanation: string;

  @Column({ name: 'suggested_action', type: 'text' })
  suggestedAction: string;

  @Column({ name: 'affected_metric', type: 'varchar', length: 100, nullable: true })
  affectedMetric?: string | null;

  @Column({ name: 'affected_day_id', type: 'int', nullable: true })
  affectedDayId?: number | null;

  @ManyToOne(() => TourDay, (day) => day.recommendations, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'affected_day_id' })
  affectedDay?: TourDay | null;

  @Column({ name: 'affected_item_id', type: 'int', nullable: true })
  affectedItemId?: number | null;

  @ManyToOne(() => ItineraryItem, (item) => item.recommendations, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'affected_item_id' })
  affectedItem?: ItineraryItem | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
