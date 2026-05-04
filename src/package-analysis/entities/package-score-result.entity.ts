import { Column, CreateDateColumn, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { PackageAnalysisRun } from './package-analysis-run.entity';

@Entity('package_score_results')
@Index('IDX_package_score_results_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_package_score_results_analysis_run_id_unique', ['analysisRunId'], { unique: true })
export class PackageScoreResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'analysis_run_id', type: 'int', unique: true })
  analysisRunId: number;

  @OneToOne(() => PackageAnalysisRun, (analysisRun) => analysisRun.scoreResult, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_run_id' })
  analysisRun: PackageAnalysisRun;

  @Column({ name: 'overall_score', type: 'int' })
  overallScore: number;

  @Column({ name: 'profitability_score', type: 'int' })
  profitabilityScore: number;

  @Column({ name: 'itinerary_balance_score', type: 'int' })
  itineraryBalanceScore: number;

  @Column({ name: 'operational_feasibility_score', type: 'int' })
  operationalFeasibilityScore: number;

  @Column({ name: 'cost_structure_score', type: 'int' })
  costStructureScore: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
