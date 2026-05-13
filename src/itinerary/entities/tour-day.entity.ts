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

import { CostItem } from '../../costs/entities/cost-item.entity';
import { DailyFatigueResult } from '../../package-analysis/entities/daily-fatigue-result.entity';
import { GeneratedRecommendation } from '../../package-analysis/entities/generated-recommendation.entity';
import { TourPackage } from '../../tour-packages/entities/tour-package.entity';
import { ItineraryItem } from './itinerary-item.entity';

@Entity('tour_days')
@Index('IDX_tour_days_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_tour_days_package_id', ['packageId'])
@Index('IDX_tour_days_package_id_day_number_unique', ['packageId', 'dayNumber'], { unique: true })
export class TourDay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'package_id', type: 'int' })
  packageId: number;

  @ManyToOne(() => TourPackage, (tourPackage) => tourPackage.days, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package: TourPackage;

  @Column({ name: 'day_number', type: 'int' })
  dayNumber: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_rest_day', type: 'boolean', default: false })
  isRestDay: boolean;

  @OneToMany(() => ItineraryItem, (item) => item.day)
  items: ItineraryItem[];

  @OneToMany(() => CostItem, (costItem) => costItem.day)
  costItems: CostItem[];

  @OneToMany(() => DailyFatigueResult, (result) => result.day)
  fatigueResults: DailyFatigueResult[];

  @OneToMany(() => GeneratedRecommendation, (recommendation) => recommendation.affectedDay)
  recommendations: GeneratedRecommendation[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
