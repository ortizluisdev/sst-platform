import { z } from 'zod'

export const reactivateUserParamsSchema = z.object({
  userId: z.string().min(1),
})

export const suspendUserParamsSchema = z.object({
  userId: z.string().min(1),
})

export const suspendUserBodySchema = z.object({
  suspendReason: z
    .string()
    .min(5, 'Escribe un motivo de al menos 5 caracteres')
    .max(1000, 'El motivo no puede superar 1000 caracteres'),
})

export const resendInvitationParamsSchema = z.object({
  userId: z.string().min(1),
})
