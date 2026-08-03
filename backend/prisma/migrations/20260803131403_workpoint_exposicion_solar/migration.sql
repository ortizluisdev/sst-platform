-- AlterTable: nullable a nivel de columna a propósito (ver comentario en
-- schema.prisma) — los puestos existentes no tienen forma de saber su
-- valor real sin adivinar, quedan en NULL hasta que una carga futura lo
-- provea.
ALTER TABLE `work_points` ADD COLUMN `exposicion_solar` BOOLEAN NULL;
