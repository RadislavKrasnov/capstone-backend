import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsRestDayToTourDays1710000000000 implements MigrationInterface {
  name = 'AddIsRestDayToTourDays1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tour_days"
      ADD COLUMN "is_rest_day" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tour_days"
      DROP COLUMN "is_rest_day"
    `);
  }
}
