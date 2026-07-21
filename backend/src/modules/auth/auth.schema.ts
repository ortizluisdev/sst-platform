import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')

export const registerSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: passwordSchema,
  nombre: z.string().min(2, 'Ingresa tu nombre completo'),
  organizationName: z.string().min(2, 'Ingresa el nombre de tu organización'),
})

export const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
})

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  newPassword: passwordSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
