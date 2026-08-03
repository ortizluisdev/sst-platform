-- AlterTable: nuevo valor de enum para mensajes manuales del admin
ALTER TABLE `notifications` MODIFY `type` ENUM(
    'SEMAFORO_CRITICO',
    'CARGA_PROCESADA',
    'CARGA_CON_ERROR',
    'CUENTA_SUSPENDIDA',
    'CUENTA_REACTIVADA',
    'REGISTRO_PENDIENTE',
    'CONTACTO_RECIBIDO',
    'LECTURA_CORREGIDA',
    'MENSAJE_ADMIN'
) NOT NULL;

-- AlterTable: borrado suave
ALTER TABLE `notifications` ADD COLUMN `deleted_at` DATETIME(3) NULL;
