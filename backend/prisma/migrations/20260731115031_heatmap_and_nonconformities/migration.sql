-- CreateTable
CREATE TABLE `service_heatmap_images` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `image_base64` LONGTEXT NOT NULL,
    `uploaded_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_heatmap_images_organization_id_service_id_key`(`organization_id`, `service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `non_conformities` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `work_point_id` VARCHAR(191) NULL,
    `reading_id` VARCHAR(191) NULL,
    `origen` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
    `prioridad` ENUM('ALTA', 'MEDIA', 'BAJA') NOT NULL DEFAULT 'MEDIA',
    `descripcion` TEXT NOT NULL,
    `variable_nombre` VARCHAR(255) NOT NULL,
    `zona` VARCHAR(255) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` ENUM('ABIERTA', 'EN_SEGUIMIENTO', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `non_conformities_reading_id_key`(`reading_id`),
    INDEX `non_conformities_organization_id_service_id_idx`(`organization_id`, `service_id`),
    INDEX `non_conformities_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `service_heatmap_images` ADD CONSTRAINT `service_heatmap_images_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_heatmap_images` ADD CONSTRAINT `service_heatmap_images_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_heatmap_images` ADD CONSTRAINT `service_heatmap_images_uploaded_by_id_fkey` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `non_conformities` ADD CONSTRAINT `non_conformities_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `non_conformities` ADD CONSTRAINT `non_conformities_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `non_conformities` ADD CONSTRAINT `non_conformities_work_point_id_fkey` FOREIGN KEY (`work_point_id`) REFERENCES `work_points`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `non_conformities` ADD CONSTRAINT `non_conformities_reading_id_fkey` FOREIGN KEY (`reading_id`) REFERENCES `variable_readings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `non_conformities` ADD CONSTRAINT `non_conformities_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

