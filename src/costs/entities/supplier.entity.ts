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
import { SupplierType } from '../../common/enums/supplier-type.enum';
import { CostItem } from './cost-item.entity';

@Entity('suppliers')
@Index('IDX_suppliers_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_suppliers_agency_id', ['agencyId'])
@Index('IDX_suppliers_agency_id_name_unique', ['agencyId', 'name'], { unique: true })
export class Supplier {
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
  name: string;

  @Column({ type: 'enum', enum: SupplierType, enumName: 'suppliers_type_enum', nullable: true })
  type?: SupplierType | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail?: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 100, nullable: true })
  contactPhone?: string | null;

  @OneToMany(() => CostItem, (costItem) => costItem.supplier)
  costItems: CostItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
