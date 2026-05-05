import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Agency } from '../agencies/entities/agency.entity';
import { PackageStatus } from '../common/enums/package-status.enum';
import { CreateTourPackageDto } from './dto/create-tour-package.dto';
import { FindTourPackagesQueryDto } from './dto/find-tour-packages-query.dto';
import { UpdateTourPackageDto } from './dto/update-tour-package.dto';
import { TourPackage } from './entities/tour-package.entity';

@Injectable()
export class TourPackagesService {
  constructor(
    @InjectRepository(TourPackage)
    private readonly tourPackagesRepository: Repository<TourPackage>,

    @InjectRepository(Agency)
    private readonly agenciesRepository: Repository<Agency>,
  ) {}

  async findAll(query: FindTourPackagesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [tourPackages, totalItems] = await this.tourPackagesRepository.findAndCount({
      relations: {
        agency: true,
      },
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: tourPackages.map((tourPackage) => this.buildSafeTourPackage(tourPackage)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async findOne(uuid: string) {
    const tourPackage = await this.findTourPackageEntityOrFail(uuid, true);

    return this.buildSafeTourPackage(tourPackage);
  }

  async create(dto: CreateTourPackageDto) {
    await this.findAgencyEntityOrFail(dto.agencyId);

    const slug = this.normalizeSlug(dto.slug);

    await this.ensureTourPackageFieldIsAvailable(dto.agencyId, 'slug', slug);

    const tourPackage = this.tourPackagesRepository.create({
      agencyId: dto.agencyId,
      title: this.normalizeText(dto.title),
      slug,
      description: dto.description ?? null,
      destinationCountry: dto.destinationCountry ?? null,
      destinationCity: dto.destinationCity ?? null,
      durationDays: dto.durationDays,
      expectedGroupSize: dto.expectedGroupSize,
      sellingPricePerPerson: dto.sellingPricePerPerson.toFixed(2),
      currencyCode: dto.currencyCode ?? 'EUR',
      status: dto.status ?? PackageStatus.DRAFT,
      internalNotes: dto.internalNotes ?? null,
    });

    const savedTourPackage = await this.tourPackagesRepository.save(tourPackage);

    return this.buildSafeTourPackage(savedTourPackage);
  }

  async update(uuid: string, dto: UpdateTourPackageDto) {
    const tourPackage = await this.findTourPackageEntityOrFail(uuid);

    const updatePayload: Partial<TourPackage> = {};

    if (dto.agencyId !== undefined) {
      await this.findAgencyEntityOrFail(dto.agencyId);
      updatePayload.agencyId = dto.agencyId;
    }

    if (dto.title !== undefined) {
      updatePayload.title = this.normalizeText(dto.title);
    }

    if (dto.slug !== undefined) {
      const slug = this.normalizeSlug(dto.slug);
      const agencyId = dto.agencyId ?? tourPackage.agencyId;

      if (slug !== tourPackage.slug || agencyId !== tourPackage.agencyId) {
        await this.ensureTourPackageFieldIsAvailable(agencyId, 'slug', slug, tourPackage.id);
      }

      updatePayload.slug = slug;
    }

    if (dto.description !== undefined) {
      updatePayload.description = dto.description;
    }

    if (dto.destinationCountry !== undefined) {
      updatePayload.destinationCountry = dto.destinationCountry;
    }

    if (dto.destinationCity !== undefined) {
      updatePayload.destinationCity = dto.destinationCity;
    }

    if (dto.durationDays !== undefined) {
      updatePayload.durationDays = dto.durationDays;
    }

    if (dto.expectedGroupSize !== undefined) {
      updatePayload.expectedGroupSize = dto.expectedGroupSize;
    }

    if (dto.sellingPricePerPerson !== undefined) {
      updatePayload.sellingPricePerPerson = dto.sellingPricePerPerson.toFixed(2);
    }

    if (dto.currencyCode !== undefined) {
      updatePayload.currencyCode = dto.currencyCode;
    }

    if (dto.status !== undefined) {
      updatePayload.status = dto.status;
    }

    if (dto.internalNotes !== undefined) {
      updatePayload.internalNotes = dto.internalNotes;
    }

    const updatedTourPackage = this.tourPackagesRepository.merge(tourPackage, updatePayload);
    const savedTourPackage = await this.tourPackagesRepository.save(updatedTourPackage);

    return this.buildSafeTourPackage(savedTourPackage);
  }

  async remove(uuid: string) {
    const tourPackage = await this.findTourPackageEntityOrFail(uuid);

    await this.tourPackagesRepository.remove(tourPackage);

    return {
      message: 'Tour package was deleted successfully',
    };
  }

  private async findTourPackageEntityOrFail(
    uuid: string,
    withRelations = false,
  ): Promise<TourPackage> {
    try {
      return await this.tourPackagesRepository.findOneOrFail({
        where: { uuid },
        relations: withRelations
          ? {
              agency: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('Tour package was not found');
    }
  }

  private async findAgencyEntityOrFail(id: number): Promise<Agency> {
    try {
      return await this.agenciesRepository.findOneOrFail({
        where: { id },
      });
    } catch {
      throw new NotFoundException('Agency was not found');
    }
  }

  private async ensureTourPackageFieldIsAvailable(
    agencyId: number,
    field: 'slug',
    value: string,
    ignoredTourPackageId?: number,
  ) {
    const existingTourPackage = await this.tourPackagesRepository.findOne({
      where: {
        agencyId,
        [field]: value,
      },
      select: {
        id: true,
      },
    });

    if (!existingTourPackage) {
      return;
    }

    if (ignoredTourPackageId && existingTourPackage.id === ignoredTourPackageId) {
      return;
    }

    throw new ConflictException(`Tour package with this ${field} already exists`);
  }

  private normalizeSlug(slug: string) {
    return slug.toLowerCase().trim();
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private buildSafeTourPackage(tourPackage: TourPackage) {
    return {
      id: tourPackage.id,
      uuid: tourPackage.uuid,
      agencyId: tourPackage.agencyId,
      agency: tourPackage.agency
        ? {
            id: tourPackage.agency.id,
            uuid: tourPackage.agency.uuid,
            name: tourPackage.agency.name,
            slug: tourPackage.agency.slug,
          }
        : undefined,
      title: tourPackage.title,
      slug: tourPackage.slug,
      description: tourPackage.description,
      destinationCountry: tourPackage.destinationCountry,
      destinationCity: tourPackage.destinationCity,
      durationDays: tourPackage.durationDays,
      expectedGroupSize: tourPackage.expectedGroupSize,
      sellingPricePerPerson: tourPackage.sellingPricePerPerson,
      currencyCode: tourPackage.currencyCode,
      status: tourPackage.status,
      internalNotes: tourPackage.internalNotes,
      createdAt: tourPackage.createdAt,
      updatedAt: tourPackage.updatedAt,
    };
  }
}
