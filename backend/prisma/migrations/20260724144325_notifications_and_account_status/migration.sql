-- AlterTable
ALTER TABLE `audit_logs` MODIFY `action` ENUM('LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'ROLE_CHANGED', 'ORG_SERVICE_GRANTED', 'ORG_SERVICE_REVOKED', 'DASHBOARD_ACCESSED', 'USER_REGISTERED', 'USER_APPROVED', 'USER_REJECTED', 'USER_REOPENED', 'VARIABLES_UPLOADED') NOT NULL;

-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `email_error` TEXT NULL,
    ADD COLUMN `email_requested` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `email_sent_at` DATETIME(3) NULL,
    ADD COLUMN `entity_id` VARCHAR(191) NULL,
    ADD COLUMN `entity_type` VARCHAR(50) NULL,
    ADD COLUMN `link` VARCHAR(500) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `organization_id` VARCHAR(191) NULL,
    ADD COLUMN `read_at` DATETIME(3) NULL,
    ADD COLUMN `severity` ENUM('CRITICAL', 'WARNING', 'INFO') NOT NULL DEFAULT 'INFO',
    MODIFY `type` ENUM('SEMAFORO_CRITICO', 'CARGA_PROCESADA', 'CARGA_CON_ERROR', 'CUENTA_APROBADA', 'CUENTA_RECHAZADA', 'REGISTRO_PENDIENTE', 'CONTACTO_RECIBIDO') NOT NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `is_active`,
    ADD COLUMN `account_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN `rejection_reason` TEXT NULL;

-- CreateIndex
CREATE INDEX `notifications_recipient_id_created_at_idx` ON `notifications`(`recipient_id`, `created_at`);

-- CreateIndex
CREATE INDEX `notifications_organization_id_idx` ON `notifications`(`organization_id`);

-- CreateIndex
CREATE INDEX `notifications_type_idx` ON `notifications`(`type`);

-- CreateIndex
CREATE INDEX `users_account_status_idx` ON `users`(`account_status`);

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

