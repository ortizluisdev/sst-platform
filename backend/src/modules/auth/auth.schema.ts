import { z } from 'zod'
import { noNewlines } from '../../utils/zodHelpers.js'

// Exportado: la Fase B.4 (activación de cuenta) reutiliza estas mismas
// reglas de complejidad al definir contraseña por primera vez. Mínimo 10 +
// mayúscula + minúscula + número + carácter especial — mismo patrón que ya
// usa la cuenta seed (ej. "superAdmin123*"), no es un estándar nuevo.
export const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')
  .regex(/[^a-zA-Z0-9]/, 'Debe incluir al menos un carácter especial')

// Solo dígitos — cédula o NIT, sin puntos ni guiones (se normalizan en el
// frontend antes de enviar, ver useLoginForm.ts).
const documentNumberSchema = z.string().regex(/^\d{5,20}$/, 'Ingresa un número de documento válido')

export const loginSchema = z.object({
  documentNumber: documentNumberSchema,
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

export const passwordResetRequestSchema = z.object({
  documentNumber: documentNumberSchema,
})

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  newPassword: passwordSchema,
})

// Fase B.5 — actualización obligatoria de perfil en el primer login. Mismo
// patrón de teléfono que contact.schema.ts (solo dígitos/espacios/+()-).
export const updateProfileSchema = z.object({
  cargo: noNewlines(z.string().min(2, 'Ingresa tu cargo')),
  telefono: z
    .string()
    .min(7, 'Ingresa un teléfono válido')
    .regex(/^[+()\d\s-]+$/, 'Solo números, espacios y +()-'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
