import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateAgencyDto } from './dto/create-agency.dto';
import { FindAgenciesQueryDto } from './dto/find-agencies-query.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { Agency } from './entities/agency.entity';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(Agency)
    private readonly agenciesRepository: Repository<Agency>,
  ) {}

  async findAll(query: FindAgenciesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [agencies, totalItems] = await this.agenciesRepository.findAndCount({
      relations: {
        users: true,
      },
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: agencies.map((agency) => this.buildSafeAgency(agency)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async findOne(uuid: string) {
    const agency = await this.findAgencyEntityOrFail(uuid, true);

    return this.buildSafeAgency(agency);
  }

  async create(dto: CreateAgencyDto) {
    const slug = this.normalizeSlug(dto.slug);

    await this.ensureAgencyFieldIsAvailable('slug', slug);

    const agency = this.agenciesRepository.create({
      name: this.normalizeText(dto.name),
      slug,
      phoneNumber: dto.phoneNumber ?? null,
      website: dto.website ?? null,
      country: dto.country ?? null,
      city: dto.city ?? null,
    });

    const savedAgency = await this.agenciesRepository.save(agency);

    return this.buildSafeAgency(savedAgency);
  }

  async update(uuid: string, dto: UpdateAgencyDto) {
    const agency = await this.findAgencyEntityOrFail(uuid);

    const updatePayload: Partial<Agency> = {};

    if (dto.name !== undefined) {
      updatePayload.name = this.normalizeText(dto.name);
    }

    if (dto.slug !== undefined) {
      const slug = this.normalizeSlug(dto.slug);

      if (slug !== agency.slug) {
        await this.ensureAgencyFieldIsAvailable('slug', slug, agency.id);
      }

      updatePayload.slug = slug;
    }

    if (dto.phoneNumber !== undefined) {
      updatePayload.phoneNumber = dto.phoneNumber;
    }

    if (dto.website !== undefined) {
      updatePayload.website = dto.website;
    }

    if (dto.country !== undefined) {
      updatePayload.country = dto.country;
    }

    if (dto.city !== undefined) {
      updatePayload.city = dto.city;
    }

    const updatedAgency = this.agenciesRepository.merge(agency, updatePayload);
    const savedAgency = await this.agenciesRepository.save(updatedAgency);

    return this.buildSafeAgency(savedAgency);
  }

  async remove(uuid: string) {
    const agency = await this.findAgencyEntityOrFail(uuid);

    await this.agenciesRepository.remove(agency);

    return {
      message: 'Agency was deleted successfully',
    };
  }

  private async findAgencyEntityOrFail(uuid: string, withUsers = false): Promise<Agency> {
    try {
      return await this.agenciesRepository.findOneOrFail({
        where: { uuid },
        relations: withUsers
          ? {
              users: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('Agency was not found');
    }
  }

  private async ensureAgencyFieldIsAvailable(
    field: 'slug',
    value: string,
    ignoredAgencyId?: number,
  ) {
    const existingAgency = await this.agenciesRepository.findOne({
      where: {
        [field]: value,
      },
      select: {
        id: true,
      },
    });

    if (!existingAgency) {
      return;
    }

    if (ignoredAgencyId && existingAgency.id === ignoredAgencyId) {
      return;
    }

    throw new ConflictException(`Agency with this ${field} already exists`);
  }

  private normalizeSlug(slug: string) {
    return slug.toLowerCase().trim();
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private buildSafeAgency(agency: Agency) {
    return {
      id: agency.id,
      uuid: agency.uuid,
      name: agency.name,
      slug: agency.slug,
      phoneNumber: agency.phoneNumber,
      website: agency.website,
      country: agency.country,
      city: agency.city,
      users: agency.users
        ? agency.users.map((user) => ({
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
          }))
        : undefined,
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
    };
  }
}
