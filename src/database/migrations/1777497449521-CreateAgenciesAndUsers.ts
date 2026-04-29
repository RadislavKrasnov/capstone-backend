import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAgenciesAndUsers1777497449521 implements MigrationInterface {
  name = 'CreateAgenciesAndUsers1777497449521';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        name: 'agencies',
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
            name: 'name',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '180',
            isNullable: false,
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'city',
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
      'agencies',
      new TableIndex({
        name: 'IDX_agencies_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'agencies',
      new TableIndex({
        name: 'IDX_agencies_slug_unique',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('OWNER', 'MANAGER')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'users',
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
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'username',
            type: 'varchar',
            length: '80',
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'date_of_birth',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'users_role_enum',
            default: "'MANAGER'",
            isNullable: false,
          },
          {
            name: 'agency_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'is_active',
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
      'users',
      new TableIndex({
        name: 'IDX_users_uuid_unique',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_email_unique',
        columnNames: ['email'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_username_unique',
        columnNames: ['username'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_agency_id',
        columnNames: ['agency_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        name: 'FK_users_agency_id',
        columnNames: ['agency_id'],
        referencedTableName: 'agencies',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('users', 'FK_users_agency_id');

    await queryRunner.dropIndex('users', 'IDX_users_agency_id');
    await queryRunner.dropIndex('users', 'IDX_users_username_unique');
    await queryRunner.dropIndex('users', 'IDX_users_email_unique');
    await queryRunner.dropIndex('users', 'IDX_users_uuid_unique');

    await queryRunner.dropTable('users');

    await queryRunner.query(`DROP TYPE "users_role_enum"`);

    await queryRunner.dropIndex('agencies', 'IDX_agencies_slug_unique');
    await queryRunner.dropIndex('agencies', 'IDX_agencies_uuid_unique');

    await queryRunner.dropTable('agencies');
  }
}
