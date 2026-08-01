import { z } from 'zod'

const LOGO_MAX_BYTES = 500 * 1024

export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Ingresa un color hexadecimal válido (#rrggbb)')

// SVG-only (no PNG): escala sin pixelado a cualquier tamaño del navbar,
// sin importar la resolución del logo original que suba el cliente.
export const logoBase64Schema = z
  .string()
  .regex(/^data:image\/svg\+xml;base64,/, 'El logo debe ser SVG')
  .refine((value) => {
    const payload = value.split(',')[1] ?? ''
    return Buffer.byteLength(payload, 'base64') <= LOGO_MAX_BYTES
  }, 'El logo no puede superar 500KB')
