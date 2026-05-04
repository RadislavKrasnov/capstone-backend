import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateTourPackageDomainTables1777830449354 implements MigrationInterface {
  name = 'CreateTourPackageDomainTables1777830449354';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TYPE "tour_packages_status_enum" AS ENUM (
        'DRAFT',
        'ANALYZED',
        'PUBLISHED',
        'ARCHIVED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "itinerary_items_type_enum" AS ENUM (
        'ACTIVITY',
        'TRANSFER',
        'MEAL',
        'FREE_TIME',
        'HOTEL',
        'FLIGHT'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "itinerary_items_intensity_enum" AS ENUM (
        'LOW',
        'MEDIUM',
        'HIGH'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "suppliers_type_enum" AS ENUM (
        'HOTEL',
        'TRANSPORT',
        'GUIDE',
        'ACTIVITY_PROVIDER',
        'RESTAURANT',
        'OTHER'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "cost_items_category_enum" AS ENUM (
        'HOTEL',
        'TRANSPORT',
        'ACTIVITY',
        'GUIDE',
        'MEAL',
        'FLIGHT',
        'INSURANCE',
        'OTHER'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "cost_items_cost_type_enum" AS ENUM (
        'FIXED',
        'PER_PERSON',
        'PER_GROUP',
        'PER_DAY'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "package_analysis_runs_analysis_status_enum" AS ENUM (
        'COMPLETED',
        'FAILED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "daily_fatigue_results_fatigue_level_enum" AS ENUM (
        'LOW',
        'MODERATE',
        'HIGH',
        'CRITICAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "generated_recommendations_category_enum" AS ENUM (
        'FINANCIAL',
        'ITINERARY',
        'OPERATIONAL',
        'COST_STRUCTURE'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "generated_recommendations_severity_enum" AS ENUM (
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'tour_packages',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'agency_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'destination_country',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'destination_city',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'duration_days',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'expected_group_size',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'selling_price_per_person',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency_code',
            type: 'char',
            length: '3',
            default: "'EUR'",
            isNullable: false,
          },
          {
            name: 'status',
            type: 'tour_packages_status_enum',
            default: "'DRAFT'",
            isNullable: false,
          },
          {
            name: 'internal_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tour_packages',
      new TableIndex({
        name: 'IDX_tour_packages_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'tour_packages',
      new TableIndex({
        name: 'IDX_tour_packages_agency_id',
        columnNames: ['agency_id'],
      }),
    );

    await queryRunner.createIndex(
      'tour_packages',
      new TableIndex({
        name: 'IDX_tour_packages_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'tour_packages',
      new TableIndex({
        name: 'IDX_tour_packages_agency_id_slug_unique',
        columnNames: ['agency_id', 'slug'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'tour_packages',
      new TableForeignKey({
        name: 'FK_tour_packages_agency_id',
        columnNames: ['agency_id'],
        referencedTableName: 'agencies',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'tour_days',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'package_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'day_number',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tour_days',
      new TableIndex({
        name: 'IDX_tour_days_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'tour_days',
      new TableIndex({
        name: 'IDX_tour_days_package_id',
        columnNames: ['package_id'],
      }),
    );

    await queryRunner.createIndex(
      'tour_days',
      new TableIndex({
        name: 'IDX_tour_days_package_id_day_number_unique',
        columnNames: ['package_id', 'day_number'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'tour_days',
      new TableForeignKey({
        name: 'FK_tour_days_package_id',
        columnNames: ['package_id'],
        referencedTableName: 'tour_packages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'itinerary_items',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'day_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'item_order',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'itinerary_items_type_enum',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'start_time',
            type: 'time',
            isNullable: true,
          },
          {
            name: 'end_time',
            type: 'time',
            isNullable: true,
          },
          {
            name: 'duration_minutes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'location_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'start_location',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'end_location',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'intensity',
            type: 'itinerary_items_intensity_enum',
            isNullable: true,
          },
          {
            name: 'is_major_activity',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'itinerary_items',
      new TableIndex({
        name: 'IDX_itinerary_items_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'itinerary_items',
      new TableIndex({
        name: 'IDX_itinerary_items_day_id',
        columnNames: ['day_id'],
      }),
    );

    await queryRunner.createIndex(
      'itinerary_items',
      new TableIndex({
        name: 'IDX_itinerary_items_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'itinerary_items',
      new TableIndex({
        name: 'IDX_itinerary_items_day_id_item_order_unique',
        columnNames: ['day_id', 'item_order'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'itinerary_items',
      new TableForeignKey({
        name: 'FK_itinerary_items_day_id',
        columnNames: ['day_id'],
        referencedTableName: 'tour_days',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'suppliers',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'agency_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'suppliers_type_enum',
            isNullable: true,
          },
          {
            name: 'contact_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'contact_phone',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'suppliers',
      new TableIndex({
        name: 'IDX_suppliers_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'suppliers',
      new TableIndex({
        name: 'IDX_suppliers_agency_id',
        columnNames: ['agency_id'],
      }),
    );

    await queryRunner.createIndex(
      'suppliers',
      new TableIndex({
        name: 'IDX_suppliers_agency_id_name_unique',
        columnNames: ['agency_id', 'name'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'suppliers',
      new TableForeignKey({
        name: 'FK_suppliers_agency_id',
        columnNames: ['agency_id'],
        referencedTableName: 'agencies',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'cost_items',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'package_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'supplier_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'day_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'itinerary_item_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'cost_items_category_enum',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cost_type',
            type: 'cost_items_cost_type_enum',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'numeric',
            precision: 10,
            scale: 2,
            default: 1,
            isNullable: false,
          },
          {
            name: 'unit_cost',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency_code',
            type: 'char',
            length: '3',
            default: "'EUR'",
            isNullable: false,
          },
          {
            name: 'is_required',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'cost_items',
      new TableIndex({
        name: 'IDX_cost_items_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'cost_items',
      new TableIndex({
        name: 'IDX_cost_items_package_id',
        columnNames: ['package_id'],
      }),
    );

    await queryRunner.createIndex(
      'cost_items',
      new TableIndex({
        name: 'IDX_cost_items_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'cost_items',
      new TableIndex({
        name: 'IDX_cost_items_supplier_id',
        columnNames: ['supplier_id'],
      }),
    );

    await queryRunner.createIndex(
      'cost_items',
      new TableIndex({
        name: 'IDX_cost_items_day_id',
        columnNames: ['day_id'],
      }),
    );

    await queryRunner.createIndex(
      'cost_items',
      new TableIndex({
        name: 'IDX_cost_items_itinerary_item_id',
        columnNames: ['itinerary_item_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'cost_items',
      new TableForeignKey({
        name: 'FK_cost_items_package_id',
        columnNames: ['package_id'],
        referencedTableName: 'tour_packages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cost_items',
      new TableForeignKey({
        name: 'FK_cost_items_supplier_id',
        columnNames: ['supplier_id'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cost_items',
      new TableForeignKey({
        name: 'FK_cost_items_day_id',
        columnNames: ['day_id'],
        referencedTableName: 'tour_days',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cost_items',
      new TableForeignKey({
        name: 'FK_cost_items_itinerary_item_id',
        columnNames: ['itinerary_item_id'],
        referencedTableName: 'itinerary_items',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'package_analysis_runs',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'package_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'triggered_by_user_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'analysis_status',
            type: 'package_analysis_runs_analysis_status_enum',
            default: "'COMPLETED'",
            isNullable: false,
          },
          {
            name: 'algorithm_version',
            type: 'varchar',
            length: '50',
            default: "'v1'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'package_analysis_runs',
      new TableIndex({
        name: 'IDX_package_analysis_runs_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'package_analysis_runs',
      new TableIndex({
        name: 'IDX_package_analysis_runs_package_id',
        columnNames: ['package_id'],
      }),
    );

    await queryRunner.createIndex(
      'package_analysis_runs',
      new TableIndex({
        name: 'IDX_package_analysis_runs_triggered_by_user_id',
        columnNames: ['triggered_by_user_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'package_analysis_runs',
      new TableForeignKey({
        name: 'FK_package_analysis_runs_package_id',
        columnNames: ['package_id'],
        referencedTableName: 'tour_packages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'package_analysis_runs',
      new TableForeignKey({
        name: 'FK_package_analysis_runs_triggered_by_user_id',
        columnNames: ['triggered_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'financial_analysis_results',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'analysis_run_id',
            type: 'integer',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'total_revenue',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'total_cost',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'gross_profit',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'gross_margin_percent',
            type: 'numeric',
            precision: 6,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'fixed_cost_total',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'variable_cost_total',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'variable_cost_per_person',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'contribution_per_person',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'break_even_group_size',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'financial_analysis_results',
      new TableIndex({
        name: 'IDX_financial_analysis_results_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'financial_analysis_results',
      new TableIndex({
        name: 'IDX_financial_analysis_results_analysis_run_id_unique',
        columnNames: ['analysis_run_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'financial_analysis_results',
      new TableForeignKey({
        name: 'FK_financial_analysis_results_analysis_run_id',
        columnNames: ['analysis_run_id'],
        referencedTableName: 'package_analysis_runs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'package_score_results',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'analysis_run_id',
            type: 'integer',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'overall_score',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'profitability_score',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'itinerary_balance_score',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'operational_feasibility_score',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'cost_structure_score',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'package_score_results',
      new TableIndex({
        name: 'IDX_package_score_results_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'package_score_results',
      new TableIndex({
        name: 'IDX_package_score_results_analysis_run_id_unique',
        columnNames: ['analysis_run_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'package_score_results',
      new TableForeignKey({
        name: 'FK_package_score_results_analysis_run_id',
        columnNames: ['analysis_run_id'],
        referencedTableName: 'package_analysis_runs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'daily_fatigue_results',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'analysis_run_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'day_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'activity_load',
            type: 'numeric',
            precision: 6,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'transfer_load',
            type: 'numeric',
            precision: 6,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'intensity_load',
            type: 'numeric',
            precision: 6,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'compression_penalty',
            type: 'numeric',
            precision: 6,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'rest_credit',
            type: 'numeric',
            precision: 6,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'fatigue_score',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'balance_score',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'fatigue_level',
            type: 'daily_fatigue_results_fatigue_level_enum',
            isNullable: false,
          },
          {
            name: 'reasons',
            type: 'jsonb',
            default: "'[]'::jsonb",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'daily_fatigue_results',
      new TableIndex({
        name: 'IDX_daily_fatigue_results_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'daily_fatigue_results',
      new TableIndex({
        name: 'IDX_daily_fatigue_results_analysis_run_id',
        columnNames: ['analysis_run_id'],
      }),
    );

    await queryRunner.createIndex(
      'daily_fatigue_results',
      new TableIndex({
        name: 'IDX_daily_fatigue_results_day_id',
        columnNames: ['day_id'],
      }),
    );

    await queryRunner.createIndex(
      'daily_fatigue_results',
      new TableIndex({
        name: 'IDX_daily_fatigue_results_analysis_run_id_day_id_unique',
        columnNames: ['analysis_run_id', 'day_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'daily_fatigue_results',
      new TableForeignKey({
        name: 'FK_daily_fatigue_results_analysis_run_id',
        columnNames: ['analysis_run_id'],
        referencedTableName: 'package_analysis_runs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'daily_fatigue_results',
      new TableForeignKey({
        name: 'FK_daily_fatigue_results_day_id',
        columnNames: ['day_id'],
        referencedTableName: 'tour_days',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'generated_recommendations',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'analysis_run_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'rule_code',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'generated_recommendations_category_enum',
            isNullable: false,
          },
          {
            name: 'severity',
            type: 'generated_recommendations_severity_enum',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'explanation',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'suggested_action',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'affected_metric',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'affected_day_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'affected_item_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'generated_recommendations',
      new TableIndex({
        name: 'IDX_generated_recommendations_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'generated_recommendations',
      new TableIndex({
        name: 'IDX_generated_recommendations_analysis_run_id',
        columnNames: ['analysis_run_id'],
      }),
    );

    await queryRunner.createIndex(
      'generated_recommendations',
      new TableIndex({
        name: 'IDX_generated_recommendations_severity',
        columnNames: ['severity'],
      }),
    );

    await queryRunner.createIndex(
      'generated_recommendations',
      new TableIndex({
        name: 'IDX_generated_recommendations_affected_day_id',
        columnNames: ['affected_day_id'],
      }),
    );

    await queryRunner.createIndex(
      'generated_recommendations',
      new TableIndex({
        name: 'IDX_generated_recommendations_affected_item_id',
        columnNames: ['affected_item_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'generated_recommendations',
      new TableForeignKey({
        name: 'FK_generated_recommendations_analysis_run_id',
        columnNames: ['analysis_run_id'],
        referencedTableName: 'package_analysis_runs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'generated_recommendations',
      new TableForeignKey({
        name: 'FK_generated_recommendations_affected_day_id',
        columnNames: ['affected_day_id'],
        referencedTableName: 'tour_days',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'generated_recommendations',
      new TableForeignKey({
        name: 'FK_generated_recommendations_affected_item_id',
        columnNames: ['affected_item_id'],
        referencedTableName: 'itinerary_items',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'package_highlights',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'package_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'text',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'display_order',
            type: 'integer',
            default: 1,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'package_highlights',
      new TableIndex({
        name: 'IDX_package_highlights_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'package_highlights',
      new TableIndex({
        name: 'IDX_package_highlights_package_id',
        columnNames: ['package_id'],
      }),
    );

    await queryRunner.createIndex(
      'package_highlights',
      new TableIndex({
        name: 'IDX_package_highlights_package_id_display_order_unique',
        columnNames: ['package_id', 'display_order'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'package_highlights',
      new TableForeignKey({
        name: 'FK_package_highlights_package_id',
        columnNames: ['package_id'],
        referencedTableName: 'tour_packages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'package_inclusions',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'package_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'text',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'display_order',
            type: 'integer',
            default: 1,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'package_inclusions',
      new TableIndex({
        name: 'IDX_package_inclusions_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'package_inclusions',
      new TableIndex({
        name: 'IDX_package_inclusions_package_id',
        columnNames: ['package_id'],
      }),
    );

    await queryRunner.createIndex(
      'package_inclusions',
      new TableIndex({
        name: 'IDX_package_inclusions_package_id_display_order_unique',
        columnNames: ['package_id', 'display_order'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'package_inclusions',
      new TableForeignKey({
        name: 'FK_package_inclusions_package_id',
        columnNames: ['package_id'],
        referencedTableName: 'tour_packages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'package_exclusions',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'package_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'text',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'display_order',
            type: 'integer',
            default: 1,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'package_exclusions',
      new TableIndex({
        name: 'IDX_package_exclusions_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'package_exclusions',
      new TableIndex({
        name: 'IDX_package_exclusions_package_id',
        columnNames: ['package_id'],
      }),
    );

    await queryRunner.createIndex(
      'package_exclusions',
      new TableIndex({
        name: 'IDX_package_exclusions_package_id_display_order_unique',
        columnNames: ['package_id', 'display_order'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'package_exclusions',
      new TableForeignKey({
        name: 'FK_package_exclusions_package_id',
        columnNames: ['package_id'],
        referencedTableName: 'tour_packages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'analysis_configurations',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'uuid',
            type: 'uuid',
            default: 'uuid_generate_v4()',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'agency_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            default: "'Default configuration'",
            isNullable: false,
          },
          {
            name: 'min_target_margin_percent',
            type: 'numeric',
            precision: 6,
            scale: 2,
            default: 15.0,
            isNullable: false,
          },
          {
            name: 'good_margin_percent',
            type: 'numeric',
            precision: 6,
            scale: 2,
            default: 25.0,
            isNullable: false,
          },
          {
            name: 'max_daily_fatigue_score',
            type: 'integer',
            default: 65,
            isNullable: false,
          },
          {
            name: 'max_transfer_minutes_per_day',
            type: 'integer',
            default: 180,
            isNullable: false,
          },
          {
            name: 'min_buffer_minutes',
            type: 'integer',
            default: 30,
            isNullable: false,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'analysis_configurations',
      new TableIndex({
        name: 'IDX_analysis_configurations_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'analysis_configurations',
      new TableIndex({
        name: 'IDX_analysis_configurations_agency_id',
        columnNames: ['agency_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'analysis_configurations',
      new TableForeignKey({
        name: 'FK_analysis_configurations_agency_id',
        columnNames: ['agency_id'],
        referencedTableName: 'agencies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createCheckConstraint(
      'tour_packages',
      new TableCheck({
        name: 'CHK_tour_packages_duration_days_positive',
        expression: 'duration_days > 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'tour_packages',
      new TableCheck({
        name: 'CHK_tour_packages_expected_group_size_positive',
        expression: 'expected_group_size > 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'tour_packages',
      new TableCheck({
        name: 'CHK_tour_packages_selling_price_non_negative',
        expression: 'selling_price_per_person >= 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'tour_days',
      new TableCheck({
        name: 'CHK_tour_days_day_number_positive',
        expression: 'day_number > 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'itinerary_items',
      new TableCheck({
        name: 'CHK_itinerary_items_item_order_positive',
        expression: 'item_order > 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'itinerary_items',
      new TableCheck({
        name: 'CHK_itinerary_items_duration_minutes_non_negative',
        expression: 'duration_minutes IS NULL OR duration_minutes >= 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'cost_items',
      new TableCheck({
        name: 'CHK_cost_items_quantity_positive',
        expression: 'quantity > 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'cost_items',
      new TableCheck({
        name: 'CHK_cost_items_unit_cost_non_negative',
        expression: 'unit_cost >= 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'package_score_results',
      new TableCheck({
        name: 'CHK_package_score_results_scores_range',
        expression:
          'overall_score BETWEEN 0 AND 100 AND profitability_score BETWEEN 0 AND 100 AND itinerary_balance_score BETWEEN 0 AND 100 AND operational_feasibility_score BETWEEN 0 AND 100 AND cost_structure_score BETWEEN 0 AND 100',
      }),
    );

    await queryRunner.createCheckConstraint(
      'daily_fatigue_results',
      new TableCheck({
        name: 'CHK_daily_fatigue_results_scores_range',
        expression: 'fatigue_score BETWEEN 0 AND 100 AND balance_score BETWEEN 0 AND 100',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropCheckConstraint(
      'daily_fatigue_results',
      'CHK_daily_fatigue_results_scores_range',
    );
    await queryRunner.dropCheckConstraint(
      'package_score_results',
      'CHK_package_score_results_scores_range',
    );
    await queryRunner.dropCheckConstraint('cost_items', 'CHK_cost_items_unit_cost_non_negative');
    await queryRunner.dropCheckConstraint('cost_items', 'CHK_cost_items_quantity_positive');
    await queryRunner.dropCheckConstraint(
      'itinerary_items',
      'CHK_itinerary_items_duration_minutes_non_negative',
    );
    await queryRunner.dropCheckConstraint(
      'itinerary_items',
      'CHK_itinerary_items_item_order_positive',
    );
    await queryRunner.dropCheckConstraint('tour_days', 'CHK_tour_days_day_number_positive');
    await queryRunner.dropCheckConstraint(
      'tour_packages',
      'CHK_tour_packages_selling_price_non_negative',
    );
    await queryRunner.dropCheckConstraint(
      'tour_packages',
      'CHK_tour_packages_expected_group_size_positive',
    );
    await queryRunner.dropCheckConstraint(
      'tour_packages',
      'CHK_tour_packages_duration_days_positive',
    );

    await queryRunner.dropForeignKey(
      'analysis_configurations',
      'FK_analysis_configurations_agency_id',
    );
    await queryRunner.dropIndex('analysis_configurations', 'IDX_analysis_configurations_agency_id');
    await queryRunner.dropIndex(
      'analysis_configurations',
      'IDX_analysis_configurations_uuid_unique',
    );
    await queryRunner.dropTable('analysis_configurations');

    await queryRunner.dropForeignKey('package_exclusions', 'FK_package_exclusions_package_id');
    await queryRunner.dropIndex(
      'package_exclusions',
      'IDX_package_exclusions_package_id_display_order_unique',
    );
    await queryRunner.dropIndex('package_exclusions', 'IDX_package_exclusions_package_id');
    await queryRunner.dropIndex('package_exclusions', 'IDX_package_exclusions_uuid_unique');
    await queryRunner.dropTable('package_exclusions');

    await queryRunner.dropForeignKey('package_inclusions', 'FK_package_inclusions_package_id');
    await queryRunner.dropIndex(
      'package_inclusions',
      'IDX_package_inclusions_package_id_display_order_unique',
    );
    await queryRunner.dropIndex('package_inclusions', 'IDX_package_inclusions_package_id');
    await queryRunner.dropIndex('package_inclusions', 'IDX_package_inclusions_uuid_unique');
    await queryRunner.dropTable('package_inclusions');

    await queryRunner.dropForeignKey('package_highlights', 'FK_package_highlights_package_id');
    await queryRunner.dropIndex(
      'package_highlights',
      'IDX_package_highlights_package_id_display_order_unique',
    );
    await queryRunner.dropIndex('package_highlights', 'IDX_package_highlights_package_id');
    await queryRunner.dropIndex('package_highlights', 'IDX_package_highlights_uuid_unique');
    await queryRunner.dropTable('package_highlights');

    await queryRunner.dropForeignKey(
      'generated_recommendations',
      'FK_generated_recommendations_affected_item_id',
    );
    await queryRunner.dropForeignKey(
      'generated_recommendations',
      'FK_generated_recommendations_affected_day_id',
    );
    await queryRunner.dropForeignKey(
      'generated_recommendations',
      'FK_generated_recommendations_analysis_run_id',
    );
    await queryRunner.dropIndex(
      'generated_recommendations',
      'IDX_generated_recommendations_affected_item_id',
    );
    await queryRunner.dropIndex(
      'generated_recommendations',
      'IDX_generated_recommendations_affected_day_id',
    );
    await queryRunner.dropIndex(
      'generated_recommendations',
      'IDX_generated_recommendations_severity',
    );
    await queryRunner.dropIndex(
      'generated_recommendations',
      'IDX_generated_recommendations_analysis_run_id',
    );
    await queryRunner.dropIndex(
      'generated_recommendations',
      'IDX_generated_recommendations_uuid_unique',
    );
    await queryRunner.dropTable('generated_recommendations');

    await queryRunner.dropForeignKey('daily_fatigue_results', 'FK_daily_fatigue_results_day_id');
    await queryRunner.dropForeignKey(
      'daily_fatigue_results',
      'FK_daily_fatigue_results_analysis_run_id',
    );
    await queryRunner.dropIndex(
      'daily_fatigue_results',
      'IDX_daily_fatigue_results_analysis_run_id_day_id_unique',
    );
    await queryRunner.dropIndex('daily_fatigue_results', 'IDX_daily_fatigue_results_day_id');
    await queryRunner.dropIndex(
      'daily_fatigue_results',
      'IDX_daily_fatigue_results_analysis_run_id',
    );
    await queryRunner.dropIndex('daily_fatigue_results', 'IDX_daily_fatigue_results_uuid_unique');
    await queryRunner.dropTable('daily_fatigue_results');

    await queryRunner.dropForeignKey(
      'package_score_results',
      'FK_package_score_results_analysis_run_id',
    );
    await queryRunner.dropIndex(
      'package_score_results',
      'IDX_package_score_results_analysis_run_id_unique',
    );
    await queryRunner.dropIndex('package_score_results', 'IDX_package_score_results_uuid_unique');
    await queryRunner.dropTable('package_score_results');

    await queryRunner.dropForeignKey(
      'financial_analysis_results',
      'FK_financial_analysis_results_analysis_run_id',
    );
    await queryRunner.dropIndex(
      'financial_analysis_results',
      'IDX_financial_analysis_results_analysis_run_id_unique',
    );
    await queryRunner.dropIndex(
      'financial_analysis_results',
      'IDX_financial_analysis_results_uuid_unique',
    );
    await queryRunner.dropTable('financial_analysis_results');

    await queryRunner.dropForeignKey(
      'package_analysis_runs',
      'FK_package_analysis_runs_triggered_by_user_id',
    );
    await queryRunner.dropForeignKey(
      'package_analysis_runs',
      'FK_package_analysis_runs_package_id',
    );
    await queryRunner.dropIndex(
      'package_analysis_runs',
      'IDX_package_analysis_runs_triggered_by_user_id',
    );
    await queryRunner.dropIndex('package_analysis_runs', 'IDX_package_analysis_runs_package_id');
    await queryRunner.dropIndex('package_analysis_runs', 'IDX_package_analysis_runs_uuid_unique');
    await queryRunner.dropTable('package_analysis_runs');

    await queryRunner.dropForeignKey('cost_items', 'FK_cost_items_itinerary_item_id');
    await queryRunner.dropForeignKey('cost_items', 'FK_cost_items_day_id');
    await queryRunner.dropForeignKey('cost_items', 'FK_cost_items_supplier_id');
    await queryRunner.dropForeignKey('cost_items', 'FK_cost_items_package_id');
    await queryRunner.dropIndex('cost_items', 'IDX_cost_items_itinerary_item_id');
    await queryRunner.dropIndex('cost_items', 'IDX_cost_items_day_id');
    await queryRunner.dropIndex('cost_items', 'IDX_cost_items_supplier_id');
    await queryRunner.dropIndex('cost_items', 'IDX_cost_items_category');
    await queryRunner.dropIndex('cost_items', 'IDX_cost_items_package_id');
    await queryRunner.dropIndex('cost_items', 'IDX_cost_items_uuid_unique');
    await queryRunner.dropTable('cost_items');

    await queryRunner.dropForeignKey('suppliers', 'FK_suppliers_agency_id');
    await queryRunner.dropIndex('suppliers', 'IDX_suppliers_agency_id_name_unique');
    await queryRunner.dropIndex('suppliers', 'IDX_suppliers_agency_id');
    await queryRunner.dropIndex('suppliers', 'IDX_suppliers_uuid_unique');
    await queryRunner.dropTable('suppliers');

    await queryRunner.dropForeignKey('itinerary_items', 'FK_itinerary_items_day_id');
    await queryRunner.dropIndex('itinerary_items', 'IDX_itinerary_items_day_id_item_order_unique');
    await queryRunner.dropIndex('itinerary_items', 'IDX_itinerary_items_type');
    await queryRunner.dropIndex('itinerary_items', 'IDX_itinerary_items_day_id');
    await queryRunner.dropIndex('itinerary_items', 'IDX_itinerary_items_uuid_unique');
    await queryRunner.dropTable('itinerary_items');

    await queryRunner.dropForeignKey('tour_days', 'FK_tour_days_package_id');
    await queryRunner.dropIndex('tour_days', 'IDX_tour_days_package_id_day_number_unique');
    await queryRunner.dropIndex('tour_days', 'IDX_tour_days_package_id');
    await queryRunner.dropIndex('tour_days', 'IDX_tour_days_uuid_unique');
    await queryRunner.dropTable('tour_days');

    await queryRunner.dropForeignKey('tour_packages', 'FK_tour_packages_agency_id');
    await queryRunner.dropIndex('tour_packages', 'IDX_tour_packages_agency_id_slug_unique');
    await queryRunner.dropIndex('tour_packages', 'IDX_tour_packages_status');
    await queryRunner.dropIndex('tour_packages', 'IDX_tour_packages_agency_id');
    await queryRunner.dropIndex('tour_packages', 'IDX_tour_packages_uuid_unique');
    await queryRunner.dropTable('tour_packages');

    await queryRunner.query(`DROP TYPE "generated_recommendations_severity_enum"`);
    await queryRunner.query(`DROP TYPE "generated_recommendations_category_enum"`);
    await queryRunner.query(`DROP TYPE "daily_fatigue_results_fatigue_level_enum"`);
    await queryRunner.query(`DROP TYPE "package_analysis_runs_analysis_status_enum"`);
    await queryRunner.query(`DROP TYPE "cost_items_cost_type_enum"`);
    await queryRunner.query(`DROP TYPE "cost_items_category_enum"`);
    await queryRunner.query(`DROP TYPE "suppliers_type_enum"`);
    await queryRunner.query(`DROP TYPE "itinerary_items_intensity_enum"`);
    await queryRunner.query(`DROP TYPE "itinerary_items_type_enum"`);
    await queryRunner.query(`DROP TYPE "tour_packages_status_enum"`);
  }
}
