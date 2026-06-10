import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { Repository } from 'typeorm';

import { Agency } from '../agencies/entities/agency.entity';
import { AppModule } from '../app.module';
import { AnalysisStatus } from '../common/enums/analysis-status.enum';
import { CostCategory } from '../common/enums/cost-category.enum';
import { CostType } from '../common/enums/cost-type.enum';
import { ItineraryIntensity } from '../common/enums/itinerary-intensity.enum';
import { ItineraryItemType } from '../common/enums/itinerary-item-type.enum';
import { PackageStatus } from '../common/enums/package-status.enum';
import { SupplierType } from '../common/enums/supplier-type.enum';
import { CostItem } from '../costs/entities/cost-item.entity';
import { Supplier } from '../costs/entities/supplier.entity';
import { ItineraryItem } from '../itinerary/entities/itinerary-item.entity';
import { TourDay } from '../itinerary/entities/tour-day.entity';
import { AnalysisConfiguration } from './entities/analysis-configuration.entity';
import { DailyFatigueResult } from './entities/daily-fatigue-result.entity';
import { FinancialAnalysisResult } from './entities/financial-analysis-result.entity';
import { GeneratedRecommendation } from './entities/generated-recommendation.entity';
import { PackageAnalysisRun } from './entities/package-analysis-run.entity';
import { PackageScoreResult } from './entities/package-score-result.entity';
import { TourPackage } from '../tour-packages/entities/tour-package.entity';
import { User, UserRole } from '../users/entities/user.entity';

type TestContext = {
  agency: Agency;
  user: User;
  tourPackage: TourPackage;
  accessToken: string;
};

describe('Package analysis integration', () => {
  let app: INestApplication;

  let agenciesRepository: Repository<Agency>;
  let usersRepository: Repository<User>;
  let tourPackagesRepository: Repository<TourPackage>;
  let tourDaysRepository: Repository<TourDay>;
  let itineraryItemsRepository: Repository<ItineraryItem>;
  let suppliersRepository: Repository<Supplier>;
  let costItemsRepository: Repository<CostItem>;
  let analysisConfigurationsRepository: Repository<AnalysisConfiguration>;
  let packageAnalysisRunsRepository: Repository<PackageAnalysisRun>;
  let financialAnalysisResultsRepository: Repository<FinancialAnalysisResult>;
  let dailyFatigueResultsRepository: Repository<DailyFatigueResult>;
  let packageScoreResultsRepository: Repository<PackageScoreResult>;
  let generatedRecommendationsRepository: Repository<GeneratedRecommendation>;

  const testPassword = 'password123';

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test_access_secret';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    agenciesRepository = app.get(getRepositoryToken(Agency));
    usersRepository = app.get(getRepositoryToken(User));
    tourPackagesRepository = app.get(getRepositoryToken(TourPackage));
    tourDaysRepository = app.get(getRepositoryToken(TourDay));
    itineraryItemsRepository = app.get(getRepositoryToken(ItineraryItem));
    suppliersRepository = app.get(getRepositoryToken(Supplier));
    costItemsRepository = app.get(getRepositoryToken(CostItem));
    analysisConfigurationsRepository = app.get(getRepositoryToken(AnalysisConfiguration));
    packageAnalysisRunsRepository = app.get(getRepositoryToken(PackageAnalysisRun));
    financialAnalysisResultsRepository = app.get(getRepositoryToken(FinancialAnalysisResult));
    dailyFatigueResultsRepository = app.get(getRepositoryToken(DailyFatigueResult));
    packageScoreResultsRepository = app.get(getRepositoryToken(PackageScoreResult));
    generatedRecommendationsRepository = app.get(getRepositoryToken(GeneratedRecommendation));
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  it('analyzes a valid package and persists analysis results', async () => {
    const context = await createValidAnalysisContext();

    const response = await request(app.getHttpServer())
      .post(`/tour-packages/${context.tourPackage.uuid}/analyze`)
      .set('Authorization', `Bearer ${context.accessToken}`)
      .expect(201);

    expect(response.body.analysisRun.status).toBe(AnalysisStatus.COMPLETED);
    expect(response.body.analysisRun.algorithmVersion).toBe('v1');

    expect(response.body.financial.totalRevenue).toBe(9000);
    expect(response.body.financial.totalCost).toBeGreaterThan(0);
    expect(response.body.financial.grossProfit).toBeGreaterThan(0);
    expect(response.body.financial.grossMarginPercent).toBeGreaterThan(0);
    expect(response.body.financial.breakEvenGroupSizeRounded).toBeGreaterThanOrEqual(1);
    expect(response.body.financial.financialRiskLevel).toBeDefined();

    expect(response.body.itinerary.dailyResults).toHaveLength(2);
    expect(response.body.itinerary.dailyResults[0].fatigueLevel).toBeDefined();

    expect(response.body.quality.overallScore).toBeGreaterThan(0);
    expect(response.body.quality.qualityLevel).toBeDefined();

    const analysisRun = await packageAnalysisRunsRepository.findOne({
      where: {
        uuid: response.body.analysisRun.uuid,
      },
      relations: {
        financialResult: true,
        scoreResult: true,
        dailyFatigueResults: true,
        recommendations: true,
      },
    });

    expect(analysisRun).toBeDefined();
    expect(analysisRun?.analysisStatus).toBe(AnalysisStatus.COMPLETED);
    expect(analysisRun?.financialResult).toBeDefined();
    expect(analysisRun?.scoreResult).toBeDefined();
    expect(analysisRun?.dailyFatigueResults).toHaveLength(2);

    const updatedPackage = await tourPackagesRepository.findOneByOrFail({
      id: context.tourPackage.id,
    });

    expect(updatedPackage.status).toBe(PackageStatus.ANALYZED);
  });

  it('rejects analysis when required cost data is missing', async () => {
    const context = await createValidAnalysisContext({
      withCosts: false,
    });

    const response = await request(app.getHttpServer())
      .post(`/tour-packages/${context.tourPackage.uuid}/analyze`)
      .set('Authorization', `Bearer ${context.accessToken}`)
      .expect(400);

    expect(response.body.message).toBe(
      'Package cannot be analyzed because required analysis data is missing.',
    );
    expect(response.body.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleCode: 'MISSING_COST_DATA',
        }),
      ]),
    );

    const analysisRunsCount = await packageAnalysisRunsRepository.count({
      where: {
        packageId: context.tourPackage.id,
      },
    });

    expect(analysisRunsCount).toBe(0);
  });

  it('rejects analysis when itinerary data is missing', async () => {
    const context = await createValidAnalysisContext({
      withItinerary: false,
    });

    const response = await request(app.getHttpServer())
      .post(`/tour-packages/${context.tourPackage.uuid}/analyze`)
      .set('Authorization', `Bearer ${context.accessToken}`)
      .expect(400);

    expect(response.body.message).toBe(
      'Package cannot be analyzed because required analysis data is missing.',
    );
    expect(response.body.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleCode: 'MISSING_ITINERARY_DATA',
        }),
      ]),
    );

    const analysisRunsCount = await packageAnalysisRunsRepository.count({
      where: {
        packageId: context.tourPackage.id,
      },
    });

    expect(analysisRunsCount).toBe(0);
  });

  async function createValidAnalysisContext(options?: {
    withCosts?: boolean;
    withItinerary?: boolean;
  }): Promise<TestContext> {
    const withCosts = options?.withCosts ?? true;
    const withItinerary = options?.withItinerary ?? true;

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 100000)}`;

    const agency = await agenciesRepository.save(
      agenciesRepository.create({
        name: 'Integration Test Travel Agency',
        slug: `integration-test-agency-${uniqueSuffix}`,
        phoneNumber: '+380501112233',
        website: 'https://integration-test-agency.com',
        country: 'Ukraine',
        city: 'Kharkiv',
      }),
    );

    const user = await usersRepository.save(
      usersRepository.create({
        email: `integration.owner.${uniqueSuffix}@example.com`,
        username: `integration_owner_${uniqueSuffix}`,
        passwordHash: await bcrypt.hash(testPassword, 10),
        firstName: 'Integration',
        lastName: 'Owner',
        agencyId: agency.id,
        role: UserRole.OWNER,
        isActive: true,
      }),
    );

    await analysisConfigurationsRepository.save(
      analysisConfigurationsRepository.create({
        agencyId: agency.id,
        name: 'Integration test configuration',
        minTargetMarginPercent: '15.00',
        goodMarginPercent: '25.00',
        maxDailyFatigueScore: 65,
        maxTransferMinutesPerDay: 180,
        minBufferMinutes: 30,
        isDefault: true,
      }),
    );

    const tourPackage = await tourPackagesRepository.save(
      tourPackagesRepository.create({
        agencyId: agency.id,
        title: 'Balanced Paris Weekend',
        slug: `balanced-paris-weekend-${uniqueSuffix}`,
        description: 'Integration test package with itinerary and required costs.',
        destinationCountry: 'France',
        destinationCity: 'Paris',
        durationDays: 2,
        expectedGroupSize: 10,
        sellingPricePerPerson: '900.00',
        currencyCode: 'EUR',
        status: PackageStatus.DRAFT,
        internalNotes: 'Created by integration test.',
      }),
    );

    const createdDays = withItinerary ? await createItinerary(tourPackage) : [];

    if (withCosts) {
      await createRequiredCosts(agency, tourPackage, createdDays[0]);
    }

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: testPassword,
      })
      .expect(201);

    return {
      agency,
      user,
      tourPackage,
      accessToken: loginResponse.body.accessToken,
    };
  }

  async function createItinerary(tourPackage: TourPackage): Promise<TourDay[]> {
    const firstDay = await tourDaysRepository.save(
      tourDaysRepository.create({
        packageId: tourPackage.id,
        dayNumber: 1,
        title: 'Arrival and city discovery',
        description: 'Arrival, transfer, city walk, and dinner.',
        isRestDay: false,
      }),
    );

    const secondDay = await tourDaysRepository.save(
      tourDaysRepository.create({
        packageId: tourPackage.id,
        dayNumber: 2,
        title: 'Museum and free time',
        description: 'Museum visit with free time in the afternoon.',
        isRestDay: false,
      }),
    );

    await itineraryItemsRepository.save([
      itineraryItemsRepository.create({
        dayId: firstDay.id,
        itemOrder: 1,
        type: ItineraryItemType.TRANSFER,
        title: 'Airport transfer',
        startTime: '09:00',
        endTime: '10:00',
        durationMinutes: 60,
        startLocation: 'Airport',
        endLocation: 'Hotel',
        isMajorActivity: true,
      }),
      itineraryItemsRepository.create({
        dayId: firstDay.id,
        itemOrder: 2,
        type: ItineraryItemType.ACTIVITY,
        title: 'Guided city walk',
        startTime: '11:00',
        endTime: '13:00',
        durationMinutes: 120,
        locationName: 'City center',
        intensity: ItineraryIntensity.MEDIUM,
        isMajorActivity: true,
      }),
      itineraryItemsRepository.create({
        dayId: firstDay.id,
        itemOrder: 3,
        type: ItineraryItemType.MEAL,
        title: 'Group dinner',
        startTime: '19:00',
        endTime: '20:30',
        durationMinutes: 90,
        locationName: 'Local restaurant',
        isMajorActivity: false,
      }),
      itineraryItemsRepository.create({
        dayId: secondDay.id,
        itemOrder: 1,
        type: ItineraryItemType.ACTIVITY,
        title: 'Museum visit',
        startTime: '10:00',
        endTime: '12:00',
        durationMinutes: 120,
        locationName: 'Museum',
        intensity: ItineraryIntensity.LOW,
        isMajorActivity: true,
      }),
      itineraryItemsRepository.create({
        dayId: secondDay.id,
        itemOrder: 2,
        type: ItineraryItemType.FREE_TIME,
        title: 'Free time',
        startTime: '14:00',
        endTime: '17:00',
        durationMinutes: 180,
        locationName: 'City center',
        isMajorActivity: false,
      }),
    ]);

    return [firstDay, secondDay];
  }

  async function createRequiredCosts(
    agency: Agency,
    tourPackage: TourPackage,
    firstDay?: TourDay,
  ): Promise<void> {
    const hotelSupplier = await suppliersRepository.save(
      suppliersRepository.create({
        agencyId: agency.id,
        name: 'Integration Test Hotel',
        type: SupplierType.HOTEL,
        contactEmail: 'hotel@example.com',
        contactPhone: '+33123456789',
      }),
    );

    const transportSupplier = await suppliersRepository.save(
      suppliersRepository.create({
        agencyId: agency.id,
        name: 'Integration Test Transport',
        type: SupplierType.TRANSPORT,
        contactEmail: 'transport@example.com',
        contactPhone: '+33123456780',
      }),
    );

    await costItemsRepository.save([
      costItemsRepository.create({
        packageId: tourPackage.id,
        supplierId: hotelSupplier.id,
        dayId: firstDay?.id ?? null,
        category: CostCategory.HOTEL,
        name: 'Hotel accommodation',
        description: 'Two nights for the group.',
        costType: CostType.PER_PERSON,
        quantity: '2.00',
        unitCost: '120.00',
        currencyCode: 'EUR',
        isRequired: true,
      }),
      costItemsRepository.create({
        packageId: tourPackage.id,
        supplierId: transportSupplier.id,
        dayId: firstDay?.id ?? null,
        category: CostCategory.TRANSPORT,
        name: 'Local transport',
        description: 'Airport transfer and local route.',
        costType: CostType.PER_GROUP,
        quantity: '1.00',
        unitCost: '700.00',
        currencyCode: 'EUR',
        isRequired: true,
      }),
      costItemsRepository.create({
        packageId: tourPackage.id,
        category: CostCategory.GUIDE,
        name: 'Local guide',
        description: 'Guide service for city walk.',
        costType: CostType.PER_DAY,
        quantity: '1.00',
        unitCost: '180.00',
        currencyCode: 'EUR',
        isRequired: true,
      }),
      costItemsRepository.create({
        packageId: tourPackage.id,
        category: CostCategory.MEAL,
        name: 'Included dinner',
        description: 'Dinner included in the package.',
        costType: CostType.PER_PERSON,
        quantity: '1.00',
        unitCost: '35.00',
        currencyCode: 'EUR',
        isRequired: true,
      }),
    ]);
  }

  async function cleanupTestData(): Promise<void> {
    const agencies = await agenciesRepository
      .createQueryBuilder('agency')
      .where('agency.slug LIKE :slug', {
        slug: 'integration-test-agency-%',
      })
      .getMany();

    if (!agencies.length) {
      return;
    }

    const agencyIds = agencies.map((agency) => agency.id);

    const packages = await tourPackagesRepository
      .createQueryBuilder('tourPackage')
      .where('tourPackage.agencyId IN (:...agencyIds)', { agencyIds })
      .getMany();

    const packageIds = packages.map((tourPackage) => tourPackage.id);

    if (packageIds.length) {
      const analysisRuns = await packageAnalysisRunsRepository
        .createQueryBuilder('analysisRun')
        .where('analysisRun.packageId IN (:...packageIds)', { packageIds })
        .getMany();

      const analysisRunIds = analysisRuns.map((analysisRun) => analysisRun.id);

      if (analysisRunIds.length) {
        await generatedRecommendationsRepository
          .createQueryBuilder()
          .delete()
          .where('analysis_run_id IN (:...analysisRunIds)', { analysisRunIds })
          .execute();

        await dailyFatigueResultsRepository
          .createQueryBuilder()
          .delete()
          .where('analysis_run_id IN (:...analysisRunIds)', { analysisRunIds })
          .execute();

        await financialAnalysisResultsRepository
          .createQueryBuilder()
          .delete()
          .where('analysis_run_id IN (:...analysisRunIds)', { analysisRunIds })
          .execute();

        await packageScoreResultsRepository
          .createQueryBuilder()
          .delete()
          .where('analysis_run_id IN (:...analysisRunIds)', { analysisRunIds })
          .execute();

        await packageAnalysisRunsRepository
          .createQueryBuilder()
          .delete()
          .where('id IN (:...analysisRunIds)', { analysisRunIds })
          .execute();
      }

      const tourDays = await tourDaysRepository
        .createQueryBuilder('tourDay')
        .where('tourDay.packageId IN (:...packageIds)', { packageIds })
        .getMany();

      const tourDayIds = tourDays.map((tourDay) => tourDay.id);

      await costItemsRepository
        .createQueryBuilder()
        .delete()
        .where('package_id IN (:...packageIds)', { packageIds })
        .execute();

      if (tourDayIds.length) {
        await itineraryItemsRepository
          .createQueryBuilder()
          .delete()
          .where('day_id IN (:...tourDayIds)', { tourDayIds })
          .execute();

        await tourDaysRepository
          .createQueryBuilder()
          .delete()
          .where('id IN (:...tourDayIds)', { tourDayIds })
          .execute();
      }

      await tourPackagesRepository
        .createQueryBuilder()
        .delete()
        .where('id IN (:...packageIds)', { packageIds })
        .execute();
    }

    await suppliersRepository
      .createQueryBuilder()
      .delete()
      .where('agency_id IN (:...agencyIds)', { agencyIds })
      .execute();

    await analysisConfigurationsRepository
      .createQueryBuilder()
      .delete()
      .where('agency_id IN (:...agencyIds)', { agencyIds })
      .execute();

    await usersRepository
      .createQueryBuilder()
      .delete()
      .where('agency_id IN (:...agencyIds)', { agencyIds })
      .execute();

    await agenciesRepository
      .createQueryBuilder()
      .delete()
      .where('id IN (:...agencyIds)', { agencyIds })
      .execute();
  }
});
