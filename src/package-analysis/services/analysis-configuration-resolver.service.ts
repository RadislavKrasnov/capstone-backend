import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { AnalysisConfiguration } from '../entities/analysis-configuration.entity';
import { ANALYSIS_DEFAULT_CONFIGURATION } from '../constants/analysis-thresholds.constants';

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
      minTargetMarginPercent: ANALYSIS_DEFAULT_CONFIGURATION.MIN_TARGET_MARGIN_PERCENT,
      goodMarginPercent: ANALYSIS_DEFAULT_CONFIGURATION.GOOD_MARGIN_PERCENT,
      maxDailyFatigueScore: ANALYSIS_DEFAULT_CONFIGURATION.MAX_DAILY_FATIGUE_SCORE,
      maxTransferMinutesPerDay: ANALYSIS_DEFAULT_CONFIGURATION.MAX_TRANSFER_MINUTES_PER_DAY,
      minBufferMinutes: ANALYSIS_DEFAULT_CONFIGURATION.MIN_BUFFER_MINUTES,
      isDefault: true,
    });
  }
}
