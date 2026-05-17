import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { Agency } from '../agencies/entities/agency.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { FindSuppliersQueryDto } from './dto/find-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,

    @InjectRepository(Agency)
    private readonly agenciesRepository: Repository<Agency>,
  ) {}

  async findAll(query: FindSuppliersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [suppliers, totalItems] = await this.suppliersRepository.findAndCount({
      where: {
        ...(query.agencyId ? { agencyId: query.agencyId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.name ? { name: ILike(`%${query.name}%`) } : {}),
      },
      relations: {
        agency: true,
      },
      order: {
        agencyId: 'ASC',
        name: 'ASC',
      },
      skip,
      take: limit,
    });

    return {
      data: suppliers.map((supplier) => this.buildSafeSupplier(supplier)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(uuid: string) {
    const supplier = await this.findSupplierEntityOrFail(uuid, true);

    return this.buildSafeSupplier(supplier);
  }

  async create(dto: CreateSupplierDto) {
    await this.findAgencyEntityOrFail(dto.agencyId);

    const normalizedName = this.normalizeText(dto.name);
    await this.ensureSupplierNameIsAvailable(dto.agencyId, normalizedName);

    const supplier = this.suppliersRepository.create({
      agencyId: dto.agencyId,
      name: normalizedName,
      type: dto.type ?? null,
      contactEmail: this.normalizeNullableText(dto.contactEmail),
      contactPhone: this.normalizeNullableText(dto.contactPhone),
    });

    const savedSupplier = await this.suppliersRepository.save(supplier);

    return this.buildSafeSupplier(savedSupplier);
  }

  async update(uuid: string, dto: UpdateSupplierDto) {
    const supplier = await this.findSupplierEntityOrFail(uuid);

    const agencyId = dto.agencyId ?? supplier.agencyId;
    const name = dto.name !== undefined ? this.normalizeText(dto.name) : supplier.name;

    if (dto.agencyId !== undefined) {
      await this.findAgencyEntityOrFail(dto.agencyId);
    }

    if (dto.agencyId !== undefined || dto.name !== undefined) {
      await this.ensureSupplierNameIsAvailable(agencyId, name, supplier.id);
    }

    const updatePayload: Partial<Supplier> = {};

    if (dto.agencyId !== undefined) {
      updatePayload.agencyId = dto.agencyId;
    }

    if (dto.name !== undefined) {
      updatePayload.name = name;
    }

    if (dto.type !== undefined) {
      updatePayload.type = dto.type;
    }

    if (dto.contactEmail !== undefined) {
      updatePayload.contactEmail = this.normalizeNullableText(dto.contactEmail);
    }

    if (dto.contactPhone !== undefined) {
      updatePayload.contactPhone = this.normalizeNullableText(dto.contactPhone);
    }

    const updatedSupplier = this.suppliersRepository.merge(supplier, updatePayload);
    const savedSupplier = await this.suppliersRepository.save(updatedSupplier);

    return this.buildSafeSupplier(savedSupplier);
  }

  async remove(uuid: string) {
    const supplier = await this.findSupplierEntityOrFail(uuid);

    await this.suppliersRepository.remove(supplier);

    return {
      message: 'Supplier was deleted successfully',
    };
  }

  private async findSupplierEntityOrFail(uuid: string, withRelations = false): Promise<Supplier> {
    try {
      return await this.suppliersRepository.findOneOrFail({
        where: { uuid },
        relations: withRelations
          ? {
              agency: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('Supplier was not found');
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

  private async ensureSupplierNameIsAvailable(
    agencyId: number,
    name: string,
    ignoredSupplierId?: number,
  ) {
    const existingSupplier = await this.suppliersRepository.findOne({
      where: {
        agencyId,
        name,
      },
      select: {
        id: true,
      },
    });

    if (!existingSupplier) {
      return;
    }

    if (ignoredSupplierId && existingSupplier.id === ignoredSupplierId) {
      return;
    }

    throw new ConflictException('Supplier with this name already exists in this agency');
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private normalizeNullableText(value?: string | null) {
    if (value === undefined || value === null) {
      return value ?? null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length ? normalizedValue : null;
  }

  private buildSafeSupplier(supplier: Supplier) {
    return {
      id: supplier.id,
      uuid: supplier.uuid,
      agencyId: supplier.agencyId,
      agency: supplier.agency
        ? {
            id: supplier.agency.id,
            uuid: supplier.agency.uuid,
            name: supplier.agency.name,
            slug: supplier.agency.slug,
          }
        : undefined,
      name: supplier.name,
      type: supplier.type,
      contactEmail: supplier.contactEmail,
      contactPhone: supplier.contactPhone,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }
}
