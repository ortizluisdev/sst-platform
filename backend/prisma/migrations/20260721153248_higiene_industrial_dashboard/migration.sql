-- AlterTable
ALTER TABLE `audit_logs` MODIFY `action` ENUM('LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'ROLE_CHANGED', 'ORG_SERVICE_GRANTED', 'ORG_SERVICE_REVOKED', 'DASHBOARD_ACCESSED', 'USER_REGISTERED', 'USER_APPROVED', 'VARIABLES_UPLOADED') NOT NULL;

-- AlterTable
ALTER TABLE `services` ADD COLUMN `update_frequency` ENUM('WEEKLY', 'BIWEEKLY') NOT NULL DEFAULT 'WEEKLY';

-- AlterTable
ALTER TABLE `variable_definitions` ADD COLUMN `categoria` VARCHAR(100) NOT NULL,
    ADD COLUMN `comparison_type` ENUM('RANGE', 'MAX_LIMIT', 'MIN_LIMIT') NOT NULL DEFAULT 'RANGE',
    ADD COLUMN `tolerancia_alerta` DOUBLE NOT NULL DEFAULT 0.1;

-- AlterTable
ALTER TABLE `variable_readings` ADD COLUMN `work_point_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `variable_uploads` ADD COLUMN `fecha_evaluacion` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `work_points` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `area_planta` VARCHAR(255) NOT NULL,
    `proceso_actividad` VARCHAR(255) NOT NULL,
    `jornada` ENUM('DIURNA', 'NOCTURNA', 'MIXTA') NOT NULL DEFAULT 'DIURNA',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `work_points_organization_id_idx`(`organization_id`),
    UNIQUE INDEX `work_points_organization_id_codigo_key`(`organization_id`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `variable_readings_work_point_id_idx` ON `variable_readings`(`work_point_id`);

-- CreateIndex
CREATE UNIQUE INDEX `variable_readings_upload_id_work_point_id_definition_id_key` ON `variable_readings`(`upload_id`, `work_point_id`, `definition_id`);

-- CreateIndex
CREATE INDEX `variable_uploads_organization_id_service_id_fecha_evaluacion_idx` ON `variable_uploads`(`organization_id`, `service_id`, `fecha_evaluacion`);

-- DropIndex (después de crear el índice de reemplazo — MySQL exige que la FK
-- organization_id/service_id siempre tenga algún índice que la respalde)
DROP INDEX `variable_uploads_organization_id_service_id_created_at_idx` ON `variable_uploads`;

-- AddForeignKey
ALTER TABLE `work_points` ADD CONSTRAINT `work_points_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `variable_readings` ADD CONSTRAINT `variable_readings_work_point_id_fkey` FOREIGN KEY (`work_point_id`) REFERENCES `work_points`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

