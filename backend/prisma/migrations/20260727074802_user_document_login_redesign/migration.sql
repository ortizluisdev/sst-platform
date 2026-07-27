-- AlterTable
ALTER TABLE `audit_logs` MODIFY `action` ENUM('LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'ROLE_CHANGED', 'ORG_SERVICE_GRANTED', 'ORG_SERVICE_REVOKED', 'DASHBOARD_ACCESSED', 'USER_CREATED_BY_ADMIN', 'ACTIVATION_INVITE_RESENT', 'ACCOUNT_ACTIVATED', 'USER_SUSPENDED', 'USER_REACTIVATED', 'PROFILE_UPDATED', 'VARIABLES_UPLOADED') NOT NULL;

-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('SEMAFORO_CRITICO', 'CARGA_PROCESADA', 'CARGA_CON_ERROR', 'CUENTA_SUSPENDIDA', 'CUENTA_REACTIVADA', 'REGISTRO_PENDIENTE', 'CONTACTO_RECIBIDO') NOT NULL;

-- AlterTable
ALTER TABLE `organizations` ADD COLUMN `contact_email` VARCHAR(255) NULL,
    ADD COLUMN `nit` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `rejection_reason`,
    ADD COLUMN `cargo` VARCHAR(150) NULL,
    ADD COLUMN `document_number` VARCHAR(20) NOT NULL,
    ADD COLUMN `document_type` ENUM('CC', 'NIT') NOT NULL DEFAULT 'CC',
    ADD COLUMN `must_update_profile` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `suspend_reason` TEXT NULL,
    ADD COLUMN `telefono` VARCHAR(50) NULL,
    MODIFY `password_hash` VARCHAR(255) NULL,
    MODIFY `account_status` ENUM('PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'PENDING_ACTIVATION';

-- CreateTable
CREATE TABLE `activation_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `activation_tokens_token_hash_key`(`token_hash`),
    INDEX `activation_tokens_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `organizations_nit_key` ON `organizations`(`nit`);

-- CreateIndex
CREATE UNIQUE INDEX `users_document_number_key` ON `users`(`document_number`);

-- CreateIndex
CREATE INDEX `users_document_number_idx` ON `users`(`document_number`);

-- AddForeignKey
ALTER TABLE `activation_tokens` ADD CONSTRAINT `activation_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

