import { z } from 'zod'
import { passwordSchema, type PasswordMessages } from './auth'

export function createActivationSchema(messages: PasswordMessages & { tokenRequired: string }) {
  return z.object({
    token: z.string().min(1, messages.tokenRequired),
    newPassword: passwordSchema(messages),
  })
}

export type ActivationFormValues = z.infer<ReturnType<typeof createActivationSchema>>
