# Estrategia de backup — MySQL en producción

**Estado: documentado, NO activado en el servidor.** Este documento es una
propuesta para revisar antes de instalar nada en `169.58.45.57`.

## Objetivo

Backups diarios automáticos de la base `romascience` (MySQL, servidor de
producción), con al menos 7 días de retención, sin exponer credenciales en
texto plano en el crontab ni en el historial de procesos (`ps aux`).

## Enfoque

`mysqldump` programado vía `cron`, guardando el dump comprimido en un
directorio local del servidor, con un script que:

1. Lee las credenciales desde un archivo de opciones de MySQL
   (`--defaults-extra-file`), no desde argumentos de línea de comandos.
2. Comprime el dump con `gzip`.
3. Nombra cada archivo con fecha (`romascience_YYYYMMDD_HHMMSS.sql.gz`).
4. Borra automáticamente los backups con más de 7 días.

## Script propuesto (`/opt/backups/mysql/backup_romascience.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/opt/backups/mysql"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEFAULTS_FILE="/opt/backups/mysql/.my.cnf"   # chmod 600, fuera de git
DB_NAME="romascience"

mkdir -p "$BACKUP_DIR"

mysqldump --defaults-extra-file="$DEFAULTS_FILE" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Retención: borra backups más viejos que RETENTION_DAYS
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
```

`--single-transaction` evita bloquear tablas InnoDB durante el dump (no
interrumpe el tráfico de la app mientras se hace el backup).

## Archivo de credenciales (`/opt/backups/mysql/.my.cnf`)

```ini
[mysqldump]
user=roma_user
password=<la contraseña real, nunca en git>
host=localhost
```

Permisos: `chmod 600 /opt/backups/mysql/.my.cnf`, propietario `laortiz`.
Este archivo **no se versiona** — se crea manualmente en el servidor la
primera vez.

## Cron propuesto

Backup diario a las 3:00 AM (horario de menor tráfico):

```cron
0 3 * * * /opt/backups/mysql/backup_romascience.sh >> /opt/backups/mysql/backup.log 2>&1
```

## Pendiente antes de activar

- [ ] Confirmar la ruta de disco disponible en el VPS para `/opt/backups/mysql`
      (verificar espacio libre — 7 dumps comprimidos de una base con archivos
      subidos por clientes puede crecer más rápido que solo texto).
- [ ] Decidir si los backups deben copiarse también fuera del mismo servidor
      (ej. a un bucket S3/Backblaze) — un backup que vive en el mismo disco
      que la base de datos no protege contra una falla de disco completa.
- [ ] Crear el usuario/credenciales de `mysqldump` con permisos mínimos
      (`SELECT`, `LOCK TABLES`, `SHOW VIEW`, `TRIGGER`, `RELOAD` — no
      necesita privilegios de escritura).
- [ ] Probar una restauración real (`mysql < backup.sql`) contra una base de
      prueba, no solo confirmar que el dump se generó.
