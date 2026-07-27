import { z } from 'zod'
import { passwordSchema } from '../auth/auth.schema.js'

export const confirmActivationSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  newPassword: passwordSchema,
})

export type ConfirmActivationInput = z.infer<typeof confirmActivationSchema>
