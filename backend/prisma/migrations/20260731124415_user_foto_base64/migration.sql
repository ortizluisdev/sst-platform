-- AlterTable
ALTER TABLE `users` DROP COLUMN `foto_url`,
    ADD COLUMN `foto_base64` LONGTEXT NULL;

