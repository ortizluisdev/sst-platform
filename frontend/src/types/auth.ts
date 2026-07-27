import { z } from 'zod'

export interface PasswordMessages {
  passwordMin: string
  passwordLowercase: string
  passwordUppercase: string
  passwordNumber: string
  passwordSpecial: string
}

export interface DocumentMessages {
  documentInvalid: string
}

/** Reglas espejo de backend/src/modules/auth/auth.schema.ts — el backend
 * sigue siendo la fuente de verdad final, esto solo evita un viaje de red
 * para errores obvios. Exportada: la reutilizan tanto reset de contraseña
 * como la pantalla de activación de cuenta (crear contraseña por primera vez). */
export function passwordSchema(messages: PasswordMessages) {
  return z
    .string()
    .min(10, messages.passwordMin)
    .regex(/[a-z]/, messages.passwordLowercase)
    .regex(/[A-Z]/, messages.passwordUppercase)
    .regex(/[0-9]/, messages.passwordNumber)
    .regex(/[^a-zA-Z0-9]/, messages.passwordSpecial)
}

export function documentNumberSchema(messages: DocumentMessages) {
  return z.string().regex(/^\d{5,20}$/, messages.documentInvalid)
}

export function createLoginSchema(messages: DocumentMessages & { passwordRequired: string }) {
  return z.object({
    documentNumber: documentNumberSchema(messages),
    password: z.string().min(1, messages.passwordRequired),
  })
}

export function createForgotPasswordSchema(messages: DocumentMessages) {
  return z.object({
    documentNumber: documentNumberSchema(messages),
  })
}

export function createResetPasswordSchema(messages: PasswordMessages & { tokenRequired: string }) {
  return z.object({
    token: z.string().min(1, messages.tokenRequired),
    newPassword: passwordSchema(messages),
  })
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>
export type ForgotPasswordFormValues = z.infer<ReturnType<typeof createForgotPasswordSchema>>
export type ResetPasswordFormValues = z.infer<ReturnType<typeof createResetPasswordSchema>>
