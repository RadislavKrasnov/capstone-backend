import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { TourPackage } from './tour-package.entity';

@Entity('package_exclusions')
@Index('IDX_package_exclusions_uuid_unique', ['uuid'], { unique: true })
@Index('IDX_package_exclusions_package_id', ['packageId'])
@Index('IDX_package_exclusions_package_id_display_order_unique', ['packageId', 'displayOrder'], {
  unique: true,
})
export class PackageExclusion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'package_id', type: 'int' })
  packageId: number;

  @ManyToOne(() => TourPackage, (tourPackage) => tourPackage.exclusions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package: TourPackage;

  @Column({ type: 'varchar', length: 255 })
  text: string;

  @Column({ name: 'display_order', type: 'int', default: 1 })
  displayOrder: number;
}
