import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida'),
  CONTACT_NOTIFICATION_EMAIL: z.string().email('CONTACT_NOTIFICATION_EMAIL debe ser un correo válido'),
  // Firman JWT y cookies respectivamente — deben ser distintos entre sí y de
  // al menos 32 bytes (64 caracteres en hex). Ver .env.example.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET debe tener al menos 32 caracteres'),
  // Zoho es opcional a propósito: el correo todavía no está configurado en producción.
  // Ver src/utils/mailer.ts — si faltan estas variables, el envío se omite de forma
  // controlada (log + email_sent=false) en lugar de tumbar el proceso.
  ZOHO_SMTP_HOST: z.string().optional(),
  ZOHO_SMTP_PORT: z.coerce.number().int().positive().optional(),
  ZOHO_SMTP_USER: z.string().optional(),
  ZOHO_SMTP_PASSWORD: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Variables de entorno inválidas o faltantes:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

export const isZohoConfigured = Boolean(
  env.ZOHO_SMTP_HOST && env.ZOHO_SMTP_PORT && env.ZOHO_SMTP_USER && env.ZOHO_SMTP_PASSWORD,
)
