-- Reordenado respecto a la salida literal de `prisma migrate diff` (que
-- genera el DROP antes que el CREATE): el índice viejo es el único que
-- respalda la foreign key de organization_id, y MySQL/InnoDB rechaza
-- borrarlo mientras no exista otro índice que la respalde. Creando primero
-- el nuevo índice único (misma columna izquierda) se satisface la FK de
-- forma continua, y el DROP del índice viejo puede aplicarse después sin error.

-- CreateIndex
CREATE UNIQUE INDEX `variable_uploads_organization_id_service_id_fecha_evaluacion_key` ON `variable_uploads`(`organization_id`, `service_id`, `fecha_evaluacion`);

-- DropIndex
DROP INDEX `variable_uploads_organization_id_service_id_fecha_evaluacion_idx` ON `variable_uploads`;

