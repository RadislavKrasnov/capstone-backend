import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { AnalysisConfiguration } from '../entities/analysis-configuration.entity';

@Injectable()
export class AnalysisConfigurationResolverService {
  constructor(
    @InjectRepository(AnalysisConfiguration)
    private readonly analysisConfigurationsRepository: Repository<AnalysisConfiguration>,
  ) {}

  async resolveForAgency(agencyId: number): Promise<AnalysisConfiguration> {
    const agencyConfiguration = await this.analysisConfigurationsRepository.findOne({
      where: { agencyId, isDefault: true },
      order: { createdAt: 'DESC' },
    });

    if (agencyConfiguration) {
      return agencyConfiguration;
    }

    const globalConfiguration = await this.analysisConfigurationsRepository.findOne({
      where: { agencyId: IsNull(), isDefault: true },
      order: { createdAt: 'DESC' },
    });

    if (globalConfiguration) {
      return globalConfiguration;
    }

    return this.analysisConfigurationsRepository.create({
      agencyId: null,
      name: 'Default configuration',
      minTargetMarginPercent: '15.00',
      goodMarginPercent: '25.00',
      maxDailyFatigueScore: 65,
      maxTransferMinutesPerDay: 180,
      minBufferMinutes: 30,
      isDefault: true,
    });
  }
}
