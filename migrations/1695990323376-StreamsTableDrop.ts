import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class StreamsTableDrop1695990323376 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=0;');
    await queryRunner.dropTable('streams', true, true, true);
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=1;');
    await queryRunner.query(
      "ALTER TABLE posts MODIFY COLUMN postType enum('post','reply','quote','share','comment','poll') NOT NULL DEFAULT 'post';",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'streams',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'stream_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'post_hash',
            type: 'varchar',
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
    await queryRunner.query(
      "ALTER TABLE posts MODIFY COLUMN postType enum('post','reply','quote','share','comment','poll','stream') NOT NULL DEFAULT 'post';",
    );
  }
}
