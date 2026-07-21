import { z } from 'zod'

export interface EmailMessages {
  emailInvalid: string
}

export interface PasswordMessages {
  passwordMin: string
  passwordLowercase: string
  passwordUppercase: string
  passwordNumber: string
}

/** Reglas espejo de backend/src/modules/auth/auth.schema.ts — el backend
 * sigue siendo la fuente de verdad final, esto solo evita un viaje de red
 * para errores obvios. */
function passwordSchema(messages: PasswordMessages) {
  return z
    .string()
    .min(10, messages.passwordMin)
    .regex(/[a-z]/, messages.passwordLowercase)
    .regex(/[A-Z]/, messages.passwordUppercase)
    .regex(/[0-9]/, messages.passwordNumber)
}

export function createLoginSchema(messages: EmailMessages & { passwordRequired: string }) {
  return z.object({
    email: z.string().email(messages.emailInvalid),
    password: z.string().min(1, messages.passwordRequired),
  })
}

export function createRegisterSchema(
  messages: EmailMessages & PasswordMessages & { nombreRequired: string; organizationNameRequired: string },
) {
  return z.object({
    nombre: z.string().min(2, messages.nombreRequired),
    email: z.string().email(messages.emailInvalid),
    organizationName: z.string().min(2, messages.organizationNameRequired),
    password: passwordSchema(messages),
  })
}

export function createForgotPasswordSchema(messages: EmailMessages) {
  return z.object({
    email: z.string().email(messages.emailInvalid),
  })
}

export function createResetPasswordSchema(messages: PasswordMessages & { tokenRequired: string }) {
  return z.object({
    token: z.string().min(1, messages.tokenRequired),
    newPassword: passwordSchema(messages),
  })
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>
export type ForgotPasswordFormValues = z.infer<ReturnType<typeof createForgotPasswordSchema>>
export type ResetPasswordFormValues = z.infer<ReturnType<typeof createResetPasswordSchema>>
