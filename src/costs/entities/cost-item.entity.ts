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

import { CostCategory } from '../../common/enums/cost-category.enum';
import { CostType } from '../../common/enums/cost-type.enum';
import { ItineraryItem } from '../../itinerary/entities/itinerary-item.entity';
import { TourDay } from '../../itinerary/entities/tour-day.entity';
import { TourPackage } from '../../tour-packages/entities/tour-package.entity';
import { Supplier } from './supplier.entity';

@Entity('cost_items')
@Index('IDX_cost_items_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_cost_items_package_id', ['packageId'])
@Index('IDX_cost_items_category', ['category'])
@Index('IDX_cost_items_supplier_id', ['supplierId'])
@Index('IDX_cost_items_day_id', ['dayId'])
@Index('IDX_cost_items_itinerary_item_id', ['itineraryItemId'])
export class CostItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'package_id', type: 'int' })
  packageId: number;

  @ManyToOne(() => TourPackage, (tourPackage) => tourPackage.costItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package: TourPackage;

  @Column({ name: 'supplier_id', type: 'int', nullable: true })
  supplierId?: number | null;

  @ManyToOne(() => Supplier, (supplier) => supplier.costItems, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier | null;

  @Column({ name: 'day_id', type: 'int', nullable: true })
  dayId?: number | null;

  @ManyToOne(() => TourDay, (day) => day.costItems, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'day_id' })
  day?: TourDay | null;

  @Column({ name: 'itinerary_item_id', type: 'int', nullable: true })
  itineraryItemId?: number | null;

  @ManyToOne(() => ItineraryItem, (item) => item.costItems, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'itinerary_item_id' })
  itineraryItem?: ItineraryItem | null;

  @Column({ type: 'enum', enum: CostCategory, enumName: 'cost_items_category_enum' })
  category: CostCategory;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'cost_type', type: 'enum', enum: CostType, enumName: 'cost_items_cost_type_enum' })
  costType: CostType;

  // PostgreSQL numeric columns are returned as strings by TypeORM.
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 1 })
  quantity: string;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 12, scale: 2 })
  unitCost: string;

  @Column({ name: 'currency_code', type: 'char', length: 3, default: 'EUR' })
  currencyCode: string;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  isRequired: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
