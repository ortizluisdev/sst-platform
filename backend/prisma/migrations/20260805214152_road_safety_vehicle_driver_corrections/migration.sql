-- DropIndex
DROP INDEX `users_email_idx` ON `users`;

-- DropIndex
DROP INDEX `users_email_key` ON `users`;

-- AlterTable
ALTER TABLE `road_safety_drivers` ADD COLUMN `corrected_fields` JSON NULL;

-- AlterTable
ALTER TABLE `road_safety_vehicles` ADD COLUMN `corrected_fields` JSON NULL;
