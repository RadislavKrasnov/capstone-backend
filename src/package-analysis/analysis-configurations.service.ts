import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Agency } from '../agencies/entities/agency.entity';
import { CreateAnalysisConfigurationDto } from './dto/create-analysis-configuration.dto';
import { FindAnalysisConfigurationsQueryDto } from './dto/find-analysis-configurations-query.dto';
import { UpdateAnalysisConfigurationDto } from './dto/update-analysis-configuration.dto';
import { AnalysisConfiguration } from './entities/analysis-configuration.entity';

@Injectable()
export class AnalysisConfigurationsService {
  constructor(
    @InjectRepository(AnalysisConfiguration)
    private readonly analysisConfigurationsRepository: Repository<AnalysisConfiguration>,

    @InjectRepository(Agency)
    private readonly agenciesRepository: Repository<Agency>,
  ) {}

  async findAll(query: FindAnalysisConfigurationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [configurations, totalItems] = await this.analysisConfigurationsRepository.findAndCount({
      where: {
        ...(query.agencyId ? { agencyId: query.agencyId } : {}),
        ...(query.isDefault !== undefined ? { isDefault: query.isDefault } : {}),
      },
      relations: {
        agency: true,
      },
      order: {
        agencyId: 'ASC',
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    return {
      data: configurations.map((configuration) =>
        this.buildSafeAnalysisConfiguration(configuration),
      ),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(uuid: string) {
    const configuration = await this.findAnalysisConfigurationEntityOrFail(uuid, true);

    return this.buildSafeAnalysisConfiguration(configuration);
  }

  async create(dto: CreateAnalysisConfigurationDto) {
    const agencyId = dto.agencyId ?? null;

    if (agencyId !== null) {
      await this.findAgencyEntityOrFail(agencyId);
    }

    this.validateMargins(dto.minTargetMarginPercent, dto.goodMarginPercent);

    if (dto.isDefault) {
      await this.unsetExistingDefaultConfiguration(agencyId);
    }

    const configuration = this.analysisConfigurationsRepository.create({
      agencyId,
      name: this.normalizeText(dto.name),
      minTargetMarginPercent: this.formatPercent(dto.minTargetMarginPercent),
      goodMarginPercent: this.formatPercent(dto.goodMarginPercent),
      maxDailyFatigueScore: dto.maxDailyFatigueScore,
      maxTransferMinutesPerDay: dto.maxTransferMinutesPerDay,
      minBufferMinutes: dto.minBufferMinutes,
      isDefault: dto.isDefault ?? false,
    });

    const savedConfiguration = await this.analysisConfigurationsRepository.save(configuration);

    return this.buildSafeAnalysisConfiguration(savedConfiguration);
  }

  async update(uuid: string, dto: UpdateAnalysisConfigurationDto) {
    const configuration = await this.findAnalysisConfigurationEntityOrFail(uuid);

    const agencyId =
      dto.agencyId !== undefined ? (dto.agencyId ?? null) : (configuration.agencyId ?? null);

    if (dto.agencyId !== undefined && agencyId !== null) {
      await this.findAgencyEntityOrFail(agencyId);
    }

    const minTargetMarginPercent =
      dto.minTargetMarginPercent !== undefined
        ? dto.minTargetMarginPercent
        : Number(configuration.minTargetMarginPercent);

    const goodMarginPercent =
      dto.goodMarginPercent !== undefined
        ? dto.goodMarginPercent
        : Number(configuration.goodMarginPercent);

    this.validateMargins(minTargetMarginPercent, goodMarginPercent);

    if (dto.isDefault === true) {
      await this.unsetExistingDefaultConfiguration(agencyId, configuration.id);
    }

    const updatePayload: Partial<AnalysisConfiguration> = {};

    if (dto.agencyId !== undefined) {
      updatePayload.agencyId = agencyId;
    }

    if (dto.name !== undefined) {
      updatePayload.name = this.normalizeText(dto.name);
    }

    if (dto.minTargetMarginPercent !== undefined) {
      updatePayload.minTargetMarginPercent = this.formatPercent(dto.minTargetMarginPercent);
    }

    if (dto.goodMarginPercent !== undefined) {
      updatePayload.goodMarginPercent = this.formatPercent(dto.goodMarginPercent);
    }

    if (dto.maxDailyFatigueScore !== undefined) {
      updatePayload.maxDailyFatigueScore = dto.maxDailyFatigueScore;
    }

    if (dto.maxTransferMinutesPerDay !== undefined) {
      updatePayload.maxTransferMinutesPerDay = dto.maxTransferMinutesPerDay;
    }

    if (dto.minBufferMinutes !== undefined) {
      updatePayload.minBufferMinutes = dto.minBufferMinutes;
    }

    if (dto.isDefault !== undefined) {
      updatePayload.isDefault = dto.isDefault;
    }

    const updatedConfiguration = this.analysisConfigurationsRepository.merge(
      configuration,
      updatePayload,
    );

    const savedConfiguration =
      await this.analysisConfigurationsRepository.save(updatedConfiguration);

    return this.buildSafeAnalysisConfiguration(savedConfiguration);
  }

  async remove(uuid: string) {
    const configuration = await this.findAnalysisConfigurationEntityOrFail(uuid);

    await this.analysisConfigurationsRepository.remove(configuration);

    return {
      message: 'Analysis configuration was deleted successfully',
    };
  }

  private async findAnalysisConfigurationEntityOrFail(
    uuid: string,
    withRelations = false,
  ): Promise<AnalysisConfiguration> {
    try {
      return await this.analysisConfigurationsRepository.findOneOrFail({
        where: { uuid },
        relations: withRelations
          ? {
              agency: true,
            }
          : undefined,
      });
    } catch {
      throw new NotFoundException('Analysis configuration was not found');
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

  private async unsetExistingDefaultConfiguration(
    agencyId: number | null,
    ignoredConfigurationId?: number,
  ) {
    const existingDefaults = await this.analysisConfigurationsRepository.find({
      where: {
        agencyId: agencyId === null ? IsNull() : agencyId,
        isDefault: true,
      },
    });

    const defaultsToUnset = existingDefaults.filter(
      (configuration) => configuration.id !== ignoredConfigurationId,
    );

    if (!defaultsToUnset.length) {
      return;
    }

    await this.analysisConfigurationsRepository.save(
      defaultsToUnset.map((configuration) => ({
        ...configuration,
        isDefault: false,
      })),
    );
  }

  private validateMargins(minTargetMarginPercent: number, goodMarginPercent: number) {
    if (goodMarginPercent < minTargetMarginPercent) {
      throw new BadRequestException(
        'Good margin percent must be greater than or equal to minimum target margin percent',
      );
    }
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private formatPercent(value: number) {
    return value.toFixed(2);
  }

  private buildSafeAnalysisConfiguration(configuration: AnalysisConfiguration) {
    return {
      id: configuration.id,
      uuid: configuration.uuid,
      agencyId: configuration.agencyId,
      agency: configuration.agency
        ? {
            id: configuration.agency.id,
            uuid: configuration.agency.uuid,
            name: configuration.agency.name,
            slug: configuration.agency.slug,
          }
        : undefined,
      name: configuration.name,
      minTargetMarginPercent: configuration.minTargetMarginPercent,
      goodMarginPercent: configuration.goodMarginPercent,
      maxDailyFatigueScore: configuration.maxDailyFatigueScore,
      maxTransferMinutesPerDay: configuration.maxTransferMinutesPerDay,
      minBufferMinutes: configuration.minBufferMinutes,
      isDefault: configuration.isDefault,
      createdAt: configuration.createdAt,
      updatedAt: configuration.updatedAt,
    };
  }
}
