import { Column, CreateDateColumn, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { PackageAnalysisRun } from './package-analysis-run.entity';

@Entity('financial_analysis_results')
@Index('IDX_financial_analysis_results_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_financial_analysis_results_analysis_run_id_unique', ['analysisRunId'], { unique: true })
export class FinancialAnalysisResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'analysis_run_id', type: 'int', unique: true })
  analysisRunId: number;

  @OneToOne(() => PackageAnalysisRun, (analysisRun) => analysisRun.financialResult, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_run_id' })
  analysisRun: PackageAnalysisRun;

  @Column({ name: 'total_revenue', type: 'numeric', precision: 12, scale: 2 })
  totalRevenue: string;

  @Column({ name: 'total_cost', type: 'numeric', precision: 12, scale: 2 })
  totalCost: string;

  @Column({ name: 'gross_profit', type: 'numeric', precision: 12, scale: 2 })
  grossProfit: string;

  @Column({ name: 'gross_margin_percent', type: 'numeric', precision: 6, scale: 2 })
  grossMarginPercent: string;

  @Column({ name: 'fixed_cost_total', type: 'numeric', precision: 12, scale: 2 })
  fixedCostTotal: string;

  @Column({ name: 'variable_cost_total', type: 'numeric', precision: 12, scale: 2 })
  variableCostTotal: string;

  @Column({ name: 'variable_cost_per_person', type: 'numeric', precision: 12, scale: 2 })
  variableCostPerPerson: string;

  @Column({ name: 'contribution_per_person', type: 'numeric', precision: 12, scale: 2 })
  contributionPerPerson: string;

  @Column({ name: 'break_even_group_size', type: 'numeric', precision: 10, scale: 2 })
  breakEvenGroupSize: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
