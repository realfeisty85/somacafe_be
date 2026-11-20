import { MigrationInterface, QueryRunner } from 'typeorm';

export class LiveChatFeature1703678420655 implements MigrationInterface {
  name = 'LiveChatFeature1703678420655';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`livechat_block_list\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`blocked_user_id\` int NOT NULL, \`stream_id\` varchar(255) NOT NULL, \`is_owner\` tinyint NOT NULL DEFAULT 0, \`status\` tinyint NOT NULL DEFAULT 1, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`hash\` varchar(72) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`livechat\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`stream_id\` varchar(255) NOT NULL, \`parent_id\` int NULL, \`count_likes\` int NOT NULL DEFAULT '0', \`comment\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`hash\` varchar(72) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryRunner.query(
      `CREATE TABLE \`livechat_users_list\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`stream_id\` varchar(255) NOT NULL, \`is_owner\` tinyint NOT NULL DEFAULT 0, \`status\` tinyint NOT NULL DEFAULT 1, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`hash\` varchar(72) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`livechat_warning_list\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`warned_user_id\` int NOT NULL, \`stream_id\` varchar(255) NOT NULL, \`is_owner\` tinyint NOT NULL DEFAULT 0, \`status\` tinyint NOT NULL DEFAULT 1, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`hash\` varchar(72) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`livechat_mute_list\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`muted_user_id\` int NOT NULL, \`stream_id\` varchar(255) NOT NULL, \`is_owner\` tinyint NOT NULL DEFAULT 0, \`status\` tinyint NOT NULL DEFAULT 1, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`hash\` varchar(72) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`livechat_mute_list\``);
    await queryRunner.query(`DROP TABLE \`livechat_warning_list\``);
    await queryRunner.query(`DROP TABLE \`livechat_users_list\``);
    await queryRunner.query(`DROP TABLE \`livechat\``);
    await queryRunner.query(`DROP TABLE \`livechat_block_list\``);
  }
}
