import { z } from 'zod'

const AVATAR_MAX_BYTES = 500 * 1024

/** Foto de perfil del representante — distinta del logo de empresa
 * (brandingSchema.ts): acepta PNG/JPEG (una selfie/foto de carné rara vez es
 * SVG) y no exige transparencia. Mismo límite de tamaño que el logo. */
export const avatarBase64Schema = z
  .string()
  .regex(/^data:image\/(png|jpe?g);base64,/, 'La foto debe ser PNG o JPEG')
  .refine((value) => {
    const payload = value.split(',')[1] ?? ''
    return Buffer.byteLength(payload, 'base64') <= AVATAR_MAX_BYTES
  }, 'La foto no puede superar 500KB')
