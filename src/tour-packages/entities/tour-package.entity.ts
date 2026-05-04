import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Agency } from '../../agencies/entities/agency.entity';
import { CostItem } from '../../costs/entities/cost-item.entity';
import { TourDay } from '../../itinerary/entities/tour-day.entity';
import { PackageAnalysisRun } from '../../package-analysis/entities/package-analysis-run.entity';
import { PackageStatus } from '../../common/enums/package-status.enum';
import { PackageExclusion } from './package-exclusion.entity';
import { PackageHighlight } from './package-highlight.entity';
import { PackageInclusion } from './package-inclusion.entity';

@Entity('tour_packages')
@Index('IDX_tour_packages_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_tour_packages_agency_id', ['agencyId'])
@Index('IDX_tour_packages_status', ['status'])
@Index('IDX_tour_packages_agency_id_slug_unique', ['agencyId', 'slug'], { unique: true })
export class TourPackage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'agency_id', type: 'int' })
  agencyId: number;

  @ManyToOne(() => Agency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'destination_country', type: 'varchar', length: 120, nullable: true })
  destinationCountry?: string | null;

  @Column({ name: 'destination_city', type: 'varchar', length: 120, nullable: true })
  destinationCity?: string | null;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  @Column({ name: 'expected_group_size', type: 'int' })
  expectedGroupSize: number;

  // TypeORM returns PostgreSQL numeric columns as strings by default.
  @Column({ name: 'selling_price_per_person', type: 'numeric', precision: 12, scale: 2 })
  sellingPricePerPerson: string;

  @Column({ name: 'currency_code', type: 'char', length: 3, default: 'EUR' })
  currencyCode: string;

  @Column({
    type: 'enum',
    enum: PackageStatus,
    enumName: 'tour_packages_status_enum',
    default: PackageStatus.DRAFT,
  })
  status: PackageStatus;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes?: string | null;

  @OneToMany(() => TourDay, (day) => day.package)
  days: TourDay[];

  @OneToMany(() => CostItem, (costItem) => costItem.package)
  costItems: CostItem[];

  @OneToMany(() => PackageAnalysisRun, (analysisRun) => analysisRun.package)
  analysisRuns: PackageAnalysisRun[];

  @OneToMany(() => PackageHighlight, (highlight) => highlight.package)
  highlights: PackageHighlight[];

  @OneToMany(() => PackageInclusion, (inclusion) => inclusion.package)
  inclusions: PackageInclusion[];

  @OneToMany(() => PackageExclusion, (exclusion) => exclusion.package)
  exclusions: PackageExclusion[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
