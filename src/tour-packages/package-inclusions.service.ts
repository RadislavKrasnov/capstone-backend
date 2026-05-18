import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreatePackageInclusionDto } from './dto/create-package-inclusion.dto';
import { FindPackageInclusionsQueryDto } from './dto/find-package-inclusions-query.dto';
import { UpdatePackageInclusionDto } from './dto/update-package-inclusion.dto';
import { PackageInclusion } from './entities/package-inclusion.entity';
import { TourPackage } from './entities/tour-package.entity';

@Injectable()
export class PackageInclusionsService {
  constructor(
    @InjectRepository(PackageInclusion)
    private readonly packageInclusionsRepository: Repository<PackageInclusion>,

    @InjectRepository(TourPackage)
    private readonly tourPackagesRepository: Repository<TourPackage>,
  ) {}

  async findAll(query: FindPackageInclusionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [inclusions, totalItems] = await this.packageInclusionsRepository.findAndCount({
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
      data: inclusions.map((inclusion) => this.buildSafePackageInclusion(inclusion)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(uuid: string) {
    const inclusion = await this.findPackageInclusionEntityOrFail(uuid, true);

    return this.buildSafePackageInclusion(inclusion);
  }

  async create(dto: CreatePackageInclusionDto) {
    await this.findTourPackageEntityOrFail(dto.packageId);
    await this.ensureDisplayOrderIsAvailable(dto.packageId, dto.displayOrder);

    const inclusion = this.packageInclusionsRepository.create({
      packageId: dto.packageId,
      text: this.normalizeText(dto.text),
      displayOrder: dto.displayOrder,
    });

    const savedInclusion = await this.packageInclusionsRepository.save(inclusion);

    return this.buildSafePackageInclusion(savedInclusion);
  }

  async update(uuid: string, dto: UpdatePackageInclusionDto) {
    const inclusion = await this.findPackageInclusionEntityOrFail(uuid);

    const updatePayload: Partial<PackageInclusion> = {};

    const packageId = dto.packageId ?? inclusion.packageId;
    const displayOrder = dto.displayOrder ?? inclusion.displayOrder;

    if (dto.packageId !== undefined) {
      await this.findTourPackageEntityOrFail(dto.packageId);
      updatePayload.packageId = dto.packageId;
    }

    if (dto.packageId !== undefined || dto.displayOrder !== undefined) {
      await this.ensureDisplayOrderIsAvailable(packageId, displayOrder, inclusion.id);
    }

    if (dto.text !== undefined) {
      updatePayload.text = this.normalizeText(dto.text);
    }

    if (dto.displayOrder !== undefined) {
      updatePayload.displayOrder = dto.displayOrder;
    }

    const updatedInclusion = this.packageInclusionsRepository.merge(inclusion, updatePayload);
    const savedInclusion = await this.packageInclusionsRepository.save(updatedInclusion);

    return this.buildSafePackageInclusion(savedInclusion);
  }

  async remove(uuid: string) {
    const inclusion = await this.findPackageInclusionEntityOrFail(uuid);

    await this.packageInclusionsRepository.remove(inclusion);

    return {
      message: 'Package inclusion was deleted successfully',
    };
  }

  private async findPackageInclusionEntityOrFail(
    uuid: string,
    withRelations = false,
  ): Promise<PackageInclusion> {
    try {
      return await this.packageInclusionsRepository.findOneOrFail({
        where: { uuid },
        relations: withRelations
          ? {
              package: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('Package inclusion was not found');
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
    ignoredPackageInclusionId?: number,
  ) {
    const existingInclusion = await this.packageInclusionsRepository.findOne({
      where: {
        packageId,
        displayOrder,
      },
      select: {
        id: true,
      },
    });

    if (!existingInclusion) {
      return;
    }

    if (ignoredPackageInclusionId && existingInclusion.id === ignoredPackageInclusionId) {
      return;
    }

    throw new ConflictException('Package inclusion with this display order already exists');
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private buildSafePackageInclusion(inclusion: PackageInclusion) {
    return {
      id: inclusion.id,
      uuid: inclusion.uuid,
      packageId: inclusion.packageId,
      package: inclusion.package
        ? {
            id: inclusion.package.id,
            uuid: inclusion.package.uuid,
            title: inclusion.package.title,
            slug: inclusion.package.slug,
          }
        : undefined,
      text: inclusion.text,
      displayOrder: inclusion.displayOrder,
    };
  }
}
