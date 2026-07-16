import { z } from 'zod'

export const contactSchema = z.object({
  nombre: z.string().min(2, 'Ingresa tu nombre completo'),
  correo: z.string().email('Ingresa un correo válido'),
  telefono: z
    .string()
    .min(7, 'Ingresa un teléfono válido')
    .regex(/^[+()\d\s-]+$/, 'Solo números, espacios y +()-'),
  empresa: z.string().optional().or(z.literal('')),
  mensaje: z.string().min(10, 'Cuéntanos un poco más (mínimo 10 caracteres)'),
})

export type ContactFormValues = z.infer<typeof contactSchema>
