import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreatePackageHighlightDto } from './dto/create-package-highlight.dto';
import { FindPackageHighlightsQueryDto } from './dto/find-package-highlights-query.dto';
import { UpdatePackageHighlightDto } from './dto/update-package-highlight.dto';
import { PackageHighlight } from './entities/package-highlight.entity';
import { TourPackage } from './entities/tour-package.entity';

@Injectable()
export class PackageHighlightsService {
  constructor(
    @InjectRepository(PackageHighlight)
    private readonly packageHighlightsRepository: Repository<PackageHighlight>,

    @InjectRepository(TourPackage)
    private readonly tourPackagesRepository: Repository<TourPackage>,
  ) {}

  async findAll(query: FindPackageHighlightsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [highlights, totalItems] = await this.packageHighlightsRepository.findAndCount({
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

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: highlights.map((highlight) => this.buildSafePackageHighlight(highlight)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async findOne(uuid: string) {
    const highlight = await this.findPackageHighlightEntityOrFail(uuid, true);

    return this.buildSafePackageHighlight(highlight);
  }

  async create(dto: CreatePackageHighlightDto) {
    await this.findTourPackageEntityOrFail(dto.packageId);
    await this.ensureDisplayOrderIsAvailable(dto.packageId, dto.displayOrder);

    const highlight = this.packageHighlightsRepository.create({
      packageId: dto.packageId,
      text: this.normalizeText(dto.text),
      displayOrder: dto.displayOrder,
    });

    const savedHighlight = await this.packageHighlightsRepository.save(highlight);

    return this.buildSafePackageHighlight(savedHighlight);
  }

  async update(uuid: string, dto: UpdatePackageHighlightDto) {
    const highlight = await this.findPackageHighlightEntityOrFail(uuid);

    const updatePayload: Partial<PackageHighlight> = {};

    const packageId = dto.packageId ?? highlight.packageId;
    const displayOrder = dto.displayOrder ?? highlight.displayOrder;

    if (dto.packageId !== undefined) {
      await this.findTourPackageEntityOrFail(dto.packageId);
      updatePayload.packageId = dto.packageId;
    }

    if (dto.packageId !== undefined || dto.displayOrder !== undefined) {
      await this.ensureDisplayOrderIsAvailable(packageId, displayOrder, highlight.id);
    }

    if (dto.text !== undefined) {
      updatePayload.text = this.normalizeText(dto.text);
    }

    if (dto.displayOrder !== undefined) {
      updatePayload.displayOrder = dto.displayOrder;
    }

    const updatedHighlight = this.packageHighlightsRepository.merge(highlight, updatePayload);
    const savedHighlight = await this.packageHighlightsRepository.save(updatedHighlight);

    return this.buildSafePackageHighlight(savedHighlight);
  }

  async remove(uuid: string) {
    const highlight = await this.findPackageHighlightEntityOrFail(uuid);

    await this.packageHighlightsRepository.remove(highlight);

    return {
      message: 'Package highlight was deleted successfully',
    };
  }

  private async findPackageHighlightEntityOrFail(
    uuid: string,
    withRelations = false,
  ): Promise<PackageHighlight> {
    try {
      return await this.packageHighlightsRepository.findOneOrFail({
        where: { uuid },
        relations: withRelations
          ? {
              package: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('Package highlight was not found');
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
    ignoredPackageHighlightId?: number,
  ) {
    const existingHighlight = await this.packageHighlightsRepository.findOne({
      where: {
        packageId,
        displayOrder,
      },
      select: {
        id: true,
      },
    });

    if (!existingHighlight) {
      return;
    }

    if (ignoredPackageHighlightId && existingHighlight.id === ignoredPackageHighlightId) {
      return;
    }

    throw new ConflictException('Package highlight with this display order already exists');
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private buildSafePackageHighlight(highlight: PackageHighlight) {
    return {
      id: highlight.id,
      uuid: highlight.uuid,
      packageId: highlight.packageId,
      package: highlight.package
        ? {
            id: highlight.package.id,
            uuid: highlight.package.uuid,
            title: highlight.package.title,
            slug: highlight.package.slug,
          }
        : undefined,
      text: highlight.text,
      displayOrder: highlight.displayOrder,
    };
  }
}
