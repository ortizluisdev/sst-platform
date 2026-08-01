import { z } from 'zod'
import { passwordSchema } from '../auth/auth.schema.js'
import { avatarBase64Schema } from '../../utils/avatarSchema.js'

// Datos PERSONALES del usuario — nunca de la organización/empresa (eso vive
// en organizationBranding). documentNumber queda fuera a propósito: es la
// credencial de login, cambiarla es un flujo aparte que no existe todavía.
export const updateOwnProfileSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  email: z.string().trim().email('Ingresa un correo válido').max(255),
  cargo: z.string().trim().max(150).optional().or(z.literal('')),
  telefono: z.string().trim().max(50).optional().or(z.literal('')),
})

export const updateOwnAvatarSchema = z.object({ fotoBase64: avatarBase64Schema })

/** Firma visual (imagen escaneada/dibujada, no criptográfica) para la
 * sección "Firma y sello" de los reportes PDF — mismo esquema de validación
 * que la foto de perfil (PNG/JPEG, 500KB). */
export const updateOwnFirmaSchema = z.object({ firmaBase64: avatarBase64Schema })

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
  newPassword: passwordSchema,
})

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

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
