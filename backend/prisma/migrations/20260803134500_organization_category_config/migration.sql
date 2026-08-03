-- CreateEnum (MySQL: representado como columna ENUM, no un tipo separado)

-- CreateTable
CREATE TABLE `organization_category_configs` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `categoria` ENUM('ESTRES_TERMICO', 'ILUMINACION', 'SONIDO', 'RADIACION_UV', 'VIBRACION') NOT NULL,
    `habilitada` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_category_configs_organization_id_categoria_key`(`organization_id`, `categoria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organization_category_configs` ADD CONSTRAINT `organization_category_configs_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: todo cliente EXISTENTE queda con las 5 categorías en
-- habilitada=true — no romper nada de lo que ya funciona hoy. Los admins
-- desactivan manualmente lo que corresponda por cliente desde ahora.
INSERT INTO `organization_category_configs` (`id`, `organization_id`, `categoria`, `habilitada`, `updated_at`)
SELECT UUID(), o.id, 'ESTRES_TERMICO', true, NOW(3) FROM `organizations` o;

INSERT INTO `organization_category_configs` (`id`, `organization_id`, `categoria`, `habilitada`, `updated_at`)
SELECT UUID(), o.id, 'ILUMINACION', true, NOW(3) FROM `organizations` o;

INSERT INTO `organization_category_configs` (`id`, `organization_id`, `categoria`, `habilitada`, `updated_at`)
SELECT UUID(), o.id, 'SONIDO', true, NOW(3) FROM `organizations` o;

INSERT INTO `organization_category_configs` (`id`, `organization_id`, `categoria`, `habilitada`, `updated_at`)
SELECT UUID(), o.id, 'RADIACION_UV', true, NOW(3) FROM `organizations` o;

INSERT INTO `organization_category_configs` (`id`, `organization_id`, `categoria`, `habilitada`, `updated_at`)
SELECT UUID(), o.id, 'VIBRACION', true, NOW(3) FROM `organizations` o;
