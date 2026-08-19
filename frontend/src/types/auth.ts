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

// Constantes compartidas entre el schema de validación y el recordatorio
// visual en vivo (PasswordRequirementsList.vue) — una sola fuente de
// verdad, así los dos nunca pueden desincronizarse (2026-08, feedback de
// cliente: "no aparecía ningún mensaje indicando los requisitos" durante
// la activación de cuenta).
const PASSWORD_MIN_LENGTH = 10
const PASSWORD_LOWERCASE_REGEX = /[a-z]/
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/
const PASSWORD_NUMBER_REGEX = /[0-9]/
const PASSWORD_SPECIAL_REGEX = /[^a-zA-Z0-9]/

/** Reglas espejo de backend/src/modules/auth/auth.schema.ts — el backend
 * sigue siendo la fuente de verdad final, esto solo evita un viaje de red
 * para errores obvios. Exportada: la reutilizan tanto reset de contraseña
 * como la pantalla de activación de cuenta (crear contraseña por primera vez). */
export function passwordSchema(messages: PasswordMessages) {
  return z
    .string()
    .min(PASSWORD_MIN_LENGTH, messages.passwordMin)
    .regex(PASSWORD_LOWERCASE_REGEX, messages.passwordLowercase)
    .regex(PASSWORD_UPPERCASE_REGEX, messages.passwordUppercase)
    .regex(PASSWORD_NUMBER_REGEX, messages.passwordNumber)
    .regex(PASSWORD_SPECIAL_REGEX, messages.passwordSpecial)
}

export interface PasswordRequirement {
  id: 'min' | 'lowercase' | 'uppercase' | 'number' | 'special'
  met: (password: string) => boolean
}

/** Mismo orden que se muestra en PasswordRequirementsList.vue. */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'min', met: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { id: 'lowercase', met: (p) => PASSWORD_LOWERCASE_REGEX.test(p) },
  { id: 'uppercase', met: (p) => PASSWORD_UPPERCASE_REGEX.test(p) },
  { id: 'number', met: (p) => PASSWORD_NUMBER_REGEX.test(p) },
  { id: 'special', met: (p) => PASSWORD_SPECIAL_REGEX.test(p) },
]

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
