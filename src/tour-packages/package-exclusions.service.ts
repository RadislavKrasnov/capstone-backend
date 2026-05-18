import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreatePackageExclusionDto } from './dto/create-package-exclusion.dto';
import { FindPackageExclusionsQueryDto } from './dto/find-package-exclusions-query.dto';
import { UpdatePackageExclusionDto } from './dto/update-package-exclusion.dto';
import { PackageExclusion } from './entities/package-exclusion.entity';
import { TourPackage } from './entities/tour-package.entity';

@Injectable()
export class PackageExclusionsService {
  constructor(
    @InjectRepository(PackageExclusion)
    private readonly packageExclusionsRepository: Repository<PackageExclusion>,

    @InjectRepository(TourPackage)
    private readonly tourPackagesRepository: Repository<TourPackage>,
  ) {}

  async findAll(query: FindPackageExclusionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [exclusions, totalItems] = await this.packageExclusionsRepository.findAndCount({
      where: {
        ...(query.packageId ? { packageId: query.packageId } : {}),
      },
      relations: {
        package: true,
      },
      order: {
        packageId: 'ASC',
        displayOrder: 'ASC',
      },
      skip,
      take: limit,
    });

    return {
      data: exclusions.map((exclusion) => this.buildSafePackageExclusion(exclusion)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(uuid: string) {
    const exclusion = await this.findPackageExclusionEntityOrFail(uuid, true);

    return this.buildSafePackageExclusion(exclusion);
  }

  async create(dto: CreatePackageExclusionDto) {
    await this.findTourPackageEntityOrFail(dto.packageId);
    await this.ensureDisplayOrderIsAvailable(dto.packageId, dto.displayOrder);

    const exclusion = this.packageExclusionsRepository.create({
      packageId: dto.packageId,
      text: this.normalizeText(dto.text),
      displayOrder: dto.displayOrder,
    });

    const savedExclusion = await this.packageExclusionsRepository.save(exclusion);

    return this.buildSafePackageExclusion(savedExclusion);
  }

  async update(uuid: string, dto: UpdatePackageExclusionDto) {
    const exclusion = await this.findPackageExclusionEntityOrFail(uuid);

    const updatePayload: Partial<PackageExclusion> = {};

    const packageId = dto.packageId ?? exclusion.packageId;
    const displayOrder = dto.displayOrder ?? exclusion.displayOrder;

    if (dto.packageId !== undefined) {
      await this.findTourPackageEntityOrFail(dto.packageId);
      updatePayload.packageId = dto.packageId;
    }

    if (dto.packageId !== undefined || dto.displayOrder !== undefined) {
      await this.ensureDisplayOrderIsAvailable(packageId, displayOrder, exclusion.id);
    }

    if (dto.text !== undefined) {
      updatePayload.text = this.normalizeText(dto.text);
    }

    if (dto.displayOrder !== undefined) {
      updatePayload.displayOrder = dto.displayOrder;
    }

    const updatedExclusion = this.packageExclusionsRepository.merge(exclusion, updatePayload);
    const savedExclusion = await this.packageExclusionsRepository.save(updatedExclusion);

    return this.buildSafePackageExclusion(savedExclusion);
  }

  async remove(uuid: string) {
    const exclusion = await this.findPackageExclusionEntityOrFail(uuid);

    await this.packageExclusionsRepository.remove(exclusion);

    return {
      message: 'Package exclusion was deleted successfully',
    };
  }

  private async findPackageExclusionEntityOrFail(
    uuid: string,
    withRelations = false,
  ): Promise<PackageExclusion> {
    try {
      return await this.packageExclusionsRepository.findOneOrFail({
        where: { uuid },
        relations: withRelations
          ? {
              package: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('Package exclusion was not found');
    }
  }

  private async findTourPackageEntityOrFail(id: number): Promise<TourPackage> {
    try {
      return await this.tourPackagesRepository.findOneOrFail({
        where: { id },
      });
    } catch {
      throw new NotFoundException('Tour package was not found');
    }
  }

  private async ensureDisplayOrderIsAvailable(
    packageId: number,
    displayOrder: number,
    ignoredPackageExclusionId?: number,
  ) {
    const existingExclusion = await this.packageExclusionsRepository.findOne({
      where: {
        packageId,
        displayOrder,
      },
      select: {
        id: true,
      },
    });

    if (!existingExclusion) {
      return;
    }

    if (ignoredPackageExclusionId && existingExclusion.id === ignoredPackageExclusionId) {
      return;
    }

    throw new ConflictException('Package exclusion with this display order already exists');
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private buildSafePackageExclusion(exclusion: PackageExclusion) {
    return {
      id: exclusion.id,
      uuid: exclusion.uuid,
      packageId: exclusion.packageId,
      package: exclusion.package
        ? {
            id: exclusion.package.id,
            uuid: exclusion.package.uuid,
            title: exclusion.package.title,
            slug: exclusion.package.slug,
          }
        : undefined,
      text: exclusion.text,
      displayOrder: exclusion.displayOrder,
    };
  }
}
