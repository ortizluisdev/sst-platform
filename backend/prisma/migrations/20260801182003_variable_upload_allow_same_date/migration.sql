-- CreateIndex (primero, para no dejar organization_id sin índice para su FK)
CREATE INDEX `variable_uploads_organization_id_service_id_fecha_evaluacion_idx` ON `variable_uploads`(`organization_id`, `service_id`, `fecha_evaluacion`);

-- DropIndex
DROP INDEX `variable_uploads_organization_id_service_id_fecha_evaluacion_key` ON `variable_uploads`;
