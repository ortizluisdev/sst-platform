-- AlterTable
ALTER TABLE `service_heatmap_images` ADD COLUMN `categoria` ENUM('ESTRES_TERMICO', 'ILUMINACION', 'SONIDO', 'RADIACION_UV', 'VIBRACION') NOT NULL,
    ADD COLUMN `zona_id` VARCHAR(191) NOT NULL;

-- CreateIndex (composite, cubre organization_id+service_id como prefijo —
-- necesario crearlo ANTES de borrar el índice viejo, porque MySQL exige que
-- esas columnas sigan cubiertas por algún índice mientras existan sus FKs)
CREATE UNIQUE INDEX `service_heatmap_images_organization_id_service_id_categoria__key` ON `service_heatmap_images`(`organization_id`, `service_id`, `categoria`, `zona_id`);

-- DropIndex
DROP INDEX `service_heatmap_images_organization_id_service_id_key` ON `service_heatmap_images`;

-- AddForeignKey
ALTER TABLE `service_heatmap_images` ADD CONSTRAINT `service_heatmap_images_zona_id_fkey` FOREIGN KEY (`zona_id`) REFERENCES `org_zonas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
