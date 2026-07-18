import type { PrismaClient, ContactSubmission } from '@prisma/client'

export interface CreateSubmissionInput {
  nombre: string
  correo: string
  telefono: string
  empresa?: string | null
  mensaje: string
  ipAddress: string
}

export function createContactRepository(prisma: PrismaClient) {
  return {
    create(data: CreateSubmissionInput): Promise<ContactSubmission> {
      return prisma.contactSubmission.create({
        data: {
          nombre: data.nombre,
          correo: data.correo,
          telefono: data.telefono,
          empresa: data.empresa || null,
          mensaje: data.mensaje,
          ipAddress: data.ipAddress,
        },
      })
    },

    markEmailSent(id: number, sent: boolean): Promise<ContactSubmission> {
      return prisma.contactSubmission.update({
        where: { id },
        data: { emailSent: sent },
      })
    },
  }
}

export type ContactRepository = ReturnType<typeof createContactRepository>
