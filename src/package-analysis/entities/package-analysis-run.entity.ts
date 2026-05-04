import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn
} from 'typeorm';

import { AnalysisStatus } from '../../common/enums/analysis-status.enum';
import { User } from '../../users/entities/user.entity';
import { TourPackage } from '../../tour-packages/entities/tour-package.entity';
import { DailyFatigueResult } from './daily-fatigue-result.entity';
import { FinancialAnalysisResult } from './financial-analysis-result.entity';
import { GeneratedRecommendation } from './generated-recommendation.entity';
import { PackageScoreResult } from './package-score-result.entity';

@Entity('package_analysis_runs')
@Index('IDX_package_analysis_runs_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_package_analysis_runs_package_id', ['packageId'])
@Index('IDX_package_analysis_runs_triggered_by_user_id', ['triggeredByUserId'])
export class PackageAnalysisRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'package_id', type: 'int' })
  packageId: number;

  @ManyToOne(() => TourPackage, (tourPackage) => tourPackage.analysisRuns, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package: TourPackage;

  @Column({ name: 'triggered_by_user_id', type: 'int', nullable: true })
  triggeredByUserId?: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'triggered_by_user_id' })
  triggeredByUser?: User | null;

  @Column({
    name: 'analysis_status',
    type: 'enum',
    enum: AnalysisStatus,
    enumName: 'package_analysis_runs_analysis_status_enum',
    default: AnalysisStatus.COMPLETED,
  })
  analysisStatus: AnalysisStatus;

  @Column({ name: 'algorithm_version', type: 'varchar', length: 50, default: 'v1' })
  algorithmVersion: string;

  @OneToOne(() => FinancialAnalysisResult, (result) => result.analysisRun)
  financialResult: FinancialAnalysisResult;

  @OneToOne(() => PackageScoreResult, (result) => result.analysisRun)
  scoreResult: PackageScoreResult;

  @OneToMany(() => DailyFatigueResult, (result) => result.analysisRun)
  dailyFatigueResults: DailyFatigueResult[];

  @OneToMany(() => GeneratedRecommendation, (recommendation) => recommendation.analysisRun)
  recommendations: GeneratedRecommendation[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
