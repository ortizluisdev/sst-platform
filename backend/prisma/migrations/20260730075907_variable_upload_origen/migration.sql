-- AlterTable
ALTER TABLE `variable_uploads` ADD COLUMN `origen` ENUM('CSV', 'REPORTE_EXCEL') NOT NULL DEFAULT 'CSV';

