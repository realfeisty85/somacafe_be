import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserTable implements MigrationInterface {
  name = 'NewMigration1706014464216';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD COLUMN \`surname\` varchar(255) DEFAULT NULL`,
    );
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`surname\``);
  }
}
