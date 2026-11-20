import { MigrationInterface, QueryRunner } from 'typeorm';

export class NewMigration1702312667482 implements MigrationInterface {
  name = 'NewMigration1702312667482';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`posts_link_meta\` CHANGE \`meta\` \`meta\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`posts_link_meta\` CHANGE \`meta\` \`meta\` json NOT NULL`,
    );
  }
}
