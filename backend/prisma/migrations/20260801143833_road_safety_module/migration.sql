-- CreateTable
CREATE TABLE `road_safety_uploads` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `uploaded_by_id` VARCHAR(191) NOT NULL,
    `original_file` VARCHAR(500) NOT NULL,
    `counts` JSON NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PROCESADO',
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `road_safety_uploads_organization_id_service_id_created_at_idx`(`organization_id`, `service_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `road_safety_vehicles` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `placa` VARCHAR(20) NOT NULL,
    `tipo` VARCHAR(100) NULL,
    `marca_linea` VARCHAR(150) NULL,
    `modelo_anio` INTEGER NULL,
    `ciudad` VARCHAR(150) NULL,
    `zona` VARCHAR(150) NULL,
    `sede` VARCHAR(150) NULL,
    `rutas_asignadas` VARCHAR(255) NULL,
    `conductores_asignados` TEXT NULL,
    `soat_vence` DATETIME(3) NULL,
    `rtm_vence` DATETIME(3) NULL,
    `poliza_rc_vence` DATETIME(3) NULL,
    `tarjeta_operacion_vence` DATETIME(3) NULL,
    `comparendos` INTEGER NOT NULL DEFAULT 0,
    `ult_mantenimiento` DATETIME(3) NULL,
    `km_actual` INTEGER NULL,
    `km_prox_mant` INTEGER NULL,
    `cambio_aceite` DATETIME(3) NULL,
    `prueba_frenado` VARCHAR(20) NULL,
    `alineacion_balanceo` DATETIME(3) NULL,
    `llantas_labrado_mm` DOUBLE NULL,
    `luces_senales` VARCHAR(20) NULL,
    `preoperacional_ult` DATETIME(3) NULL,
    `consumo_gal_mes` DOUBLE NULL,
    `rendimiento_km_gal` DOUBLE NULL,
    `rendimiento_base_km_gal` DOUBLE NULL,
    `seguridad_activa` BOOLEAN NULL,
    `seguridad_pasiva` BOOLEAN NULL,
    `gps_telemetria` BOOLEAN NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `road_safety_vehicles_organization_id_placa_key`(`organization_id`, `placa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `road_safety_drivers` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `documento` VARCHAR(20) NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `cargo` VARCHAR(150) NULL,
    `actor_vial` VARCHAR(150) NULL,
    `ciudad` VARCHAR(150) NULL,
    `sede` VARCHAR(150) NULL,
    `vehiculos_asignados` TEXT NULL,
    `lic_categoria` VARCHAR(20) NULL,
    `licencia_vence` DATETIME(3) NULL,
    `psicosensometrico_vence` DATETIME(3) NULL,
    `estado_salud` VARCHAR(20) NULL,
    `n_cursos_sv` INTEGER NULL,
    `horas_formacion` DOUBLE NULL,
    `ultima_capacitacion` DATETIME(3) NULL,
    `reentrenamiento_programado` DATETIME(3) NULL,
    `score_conduccion_segura` INTEGER NULL,
    `score_manejo_defensivo` INTEGER NULL,
    `score_manejo_comentado_diurno` INTEGER NULL,
    `score_manejo_comentado_nocturno` INTEGER NULL,
    `score_conocimiento_vehiculo` INTEGER NULL,
    `score_normas_transito` INTEGER NULL,
    `score_gestion_fatiga` INTEGER NULL,
    `score_investigacion_siniestros` INTEGER NULL,
    `score_primeros_auxilios` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `road_safety_drivers_organization_id_documento_key`(`organization_id`, `documento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `road_safety_pesv_steps` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `fase` VARCHAR(5) NOT NULL,
    `paso` INTEGER NOT NULL,
    `elemento` VARCHAR(255) NOT NULL,
    `nivel_aplicable` VARCHAR(100) NULL,
    `cumplimiento` VARCHAR(20) NOT NULL,
    `porcentaje_avance` INTEGER NULL,
    `evidencia` TEXT NULL,
    `observaciones` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `road_safety_pesv_steps_organization_id_paso_key`(`organization_id`, `paso`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `road_safety_inventory_items` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `grupo` VARCHAR(50) NOT NULL,
    `concepto` VARCHAR(150) NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 0,
    `observaciones` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `road_safety_inventory_items_organization_id_grupo_concepto_key`(`organization_id`, `grupo`, `concepto`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `road_safety_routes` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(50) NULL,
    `version` VARCHAR(20) NULL,
    `fecha` DATETIME(3) NULL,
    `id_ruta` VARCHAR(50) NOT NULL,
    `cliente_proyecto` VARCHAR(255) NULL,
    `origen` VARCHAR(255) NULL,
    `destino` VARCHAR(255) NULL,
    `ruta_alterna` VARCHAR(255) NULL,
    `sitios_parada` VARCHAR(255) NULL,
    `kms_recorridos` VARCHAR(50) NULL,
    `duracion` VARCHAR(50) NULL,
    `sst_nombre_telefono` VARCHAR(255) NULL,
    `operaciones_nombre_telefono` VARCHAR(255) NULL,
    `mapa_imagen_base64` LONGTEXT NULL,
    `condiciones_riesgo` JSON NULL,
    `organismos_apoyo_local` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `road_safety_routes_organization_id_id_ruta_key`(`organization_id`, `id_ruta`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `road_safety_route_points` (
    `id` VARCHAR(191) NOT NULL,
    `route_id` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `km_via_referencia` VARCHAR(255) NULL,
    `senales_transito` TEXT NULL,
    `aspectos_relevantes` TEXT NULL,
    `controles_existentes` TEXT NULL,
    `recomendaciones_seguridad` TEXT NULL,
    `riesgo_mas_relevante` VARCHAR(20) NULL,

    INDEX `road_safety_route_points_route_id_idx`(`route_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `road_safety_uploads` ADD CONSTRAINT `road_safety_uploads_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `road_safety_uploads` ADD CONSTRAINT `road_safety_uploads_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `road_safety_uploads` ADD CONSTRAINT `road_safety_uploads_uploaded_by_id_fkey` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `road_safety_vehicles` ADD CONSTRAINT `road_safety_vehicles_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `road_safety_drivers` ADD CONSTRAINT `road_safety_drivers_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `road_safety_pesv_steps` ADD CONSTRAINT `road_safety_pesv_steps_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `road_safety_inventory_items` ADD CONSTRAINT `road_safety_inventory_items_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `road_safety_routes` ADD CONSTRAINT `road_safety_routes_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `road_safety_route_points` ADD CONSTRAINT `road_safety_route_points_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `road_safety_routes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

