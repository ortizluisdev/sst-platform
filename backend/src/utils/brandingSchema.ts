import { z } from 'zod'

const LOGO_MAX_BYTES = 500 * 1024

export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Ingresa un color hexadecimal válido (#rrggbb)')

// SVG (escala sin pixelado) + PNG/JPG como respaldo — el SVG-only exigía que
// un cliente con logo raster (degradados/fotografía) lo pasara por un
// conversor automático antes de subirlo, y esos conversores suelen dejar
// paths sin `fill` (negro por defecto del spec SVG): se veía oscuro en vez
// de a color (2026-08, feedback de cliente). El GET de organizationBranding
// ya aceptaba png|svg+xml desde antes (logos legado) — este regex solo
// alcanza el mismo criterio también para subidas nuevas.
export const logoBase64Schema = z
  .string()
  .regex(/^data:image\/(?:svg\+xml|png|jpeg);base64,/, 'El logo debe ser SVG, PNG o JPG')
  .refine((value) => {
    const payload = value.split(',')[1] ?? ''
    return Buffer.byteLength(payload, 'base64') <= LOGO_MAX_BYTES
  }, 'El logo no puede superar 500KB')
