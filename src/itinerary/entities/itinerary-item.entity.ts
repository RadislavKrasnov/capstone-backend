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
import { ItineraryIntensity } from '../../common/enums/itinerary-intensity.enum';
import { ItineraryItemType } from '../../common/enums/itinerary-item-type.enum';
import { GeneratedRecommendation } from '../../package-analysis/entities/generated-recommendation.entity';
import { TourDay } from './tour-day.entity';

@Entity('itinerary_items')
@Index('IDX_itinerary_items_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_itinerary_items_day_id', ['dayId'])
@Index('IDX_itinerary_items_type', ['type'])
@Index('IDX_itinerary_items_day_id_item_order_unique', ['dayId', 'itemOrder'], { unique: true })
export class ItineraryItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'day_id', type: 'int' })
  dayId: number;

  @ManyToOne(() => TourDay, (day) => day.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'day_id' })
  day: TourDay;

  @Column({ name: 'item_order', type: 'int' })
  itemOrder: number;

  @Column({ type: 'enum', enum: ItineraryItemType, enumName: 'itinerary_items_type_enum' })
  type: ItineraryItemType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime?: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime?: string | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes?: number | null;

  @Column({ name: 'location_name', type: 'varchar', length: 255, nullable: true })
  locationName?: string | null;

  @Column({ name: 'start_location', type: 'varchar', length: 255, nullable: true })
  startLocation?: string | null;

  @Column({ name: 'end_location', type: 'varchar', length: 255, nullable: true })
  endLocation?: string | null;

  @Column({
    type: 'enum',
    enum: ItineraryIntensity,
    enumName: 'itinerary_items_intensity_enum',
    nullable: true,
  })
  intensity?: ItineraryIntensity | null;

  @Column({ name: 'is_major_activity', type: 'boolean', default: false })
  isMajorActivity: boolean;

  @OneToMany(() => CostItem, (costItem) => costItem.itineraryItem)
  costItems: CostItem[];

  @OneToMany(() => GeneratedRecommendation, (recommendation) => recommendation.affectedItem)
  recommendations: GeneratedRecommendation[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
