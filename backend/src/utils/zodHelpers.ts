import { z } from 'zod'

/**
 * Rechaza \r y \n en campos de texto libre que puedan terminar en un header
 * de correo (ej. "nombre" en el asunto del email de contacto). Nodemailer ya
 * sanea esto internamente, pero validar en el borde es más barato que confiar
 * únicamente en que una librería de terceros lo siga haciendo para siempre.
 * Uso: noNewlines(z.string().min(2, '...'))
 */
export function noNewlines(schema: z.ZodString) {
  return schema.refine((value) => !/[\r\n]/.test(value), 'No se permiten saltos de línea')
}
