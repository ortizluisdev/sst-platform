import { z } from 'zod'

const LOGO_MAX_BYTES = 500 * 1024

export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Ingresa un color hexadecimal válido (#rrggbb)')

export const logoBase64Schema = z
  .string()
  .regex(/^data:image\/(png|svg\+xml);base64,/, 'El logo debe ser PNG o SVG')
  .refine((value) => {
    const payload = value.split(',')[1] ?? ''
    return Buffer.byteLength(payload, 'base64') <= LOGO_MAX_BYTES
  }, 'El logo no puede superar 500KB')
