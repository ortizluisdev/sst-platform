import type { PrismaClient, Prisma } from '@prisma/client'
import type {
  RoadSafetyParseResult,
  ParsedVehiculo,
  ParsedConductor,
  ParsedPesvPaso,
  ParsedInventarioItem,
  ParsedRuta,
} from '../../utils/roadSafetyWorkbookParser.js'

type Tx = Prisma.TransactionClient

export function createRoadSafetyRepository(prisma: PrismaClient) {
  return {
    findServiceBySlug(slug: string) {
      return prisma.service.findUnique({ where: { slug } })
    },

    findOrganizationById(id: string) {
      return prisma.organization.findUnique({ where: { id }, select: { id: true, nombre: true, nit: true } })
    },

    /** Procesa el libro completo (las 4 hojas a la vez) en una sola
     * transacción: upsert de vehículos/conductores/pasos PESV/inventario
     * por su llave natural (reemplaza lo existente, no acumula), la ruta
     * de la Hoja 4 también por idRuta (reemplaza sus puntos completos), y
     * deja un RoadSafetyUpload como registro de auditoría/historial. */
    async createUploadTransaction(input: {
      organizationId: string
      serviceId: string
      uploadedById: string
      originalFile: string
      parsed: RoadSafetyParseResult
    }) {
      return prisma.$transaction(async (tx) => {
        for (const paso of input.parsed.pesvPasos) {
          await upsertPesvPaso(tx, input.organizationId, paso)
        }
        for (const item of input.parsed.inventario) {
          await upsertInventarioItem(tx, input.organizationId, item)
        }
        for (const vehiculo of input.parsed.vehiculos) {
          await upsertVehiculo(tx, input.organizationId, vehiculo)
        }
        for (const conductor of input.parsed.conductores) {
          await upsertConductor(tx, input.organizationId, conductor)
        }
        if (input.parsed.ruta) {
          await upsertRuta(tx, input.organizationId, input.parsed.ruta)
        }

        return tx.roadSafetyUpload.create({
          data: {
            organizationId: input.organizationId,
            serviceId: input.serviceId,
            uploadedById: input.uploadedById,
            originalFile: input.originalFile,
            counts: {
              pesvPasos: input.parsed.pesvPasos.length,
              inventario: input.parsed.inventario.length,
              vehiculos: input.parsed.vehiculos.length,
              conductores: input.parsed.conductores.length,
              rutaPuntos: input.parsed.ruta?.puntos.length ?? 0,
            },
          },
        })
      })
    },

    findUploadHistory(organizationId: string, serviceId: string) {
      return prisma.roadSafetyUpload.findMany({
        where: { organizationId, serviceId },
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: { select: { nombre: true } } },
      })
    },

    findPesvPasos(organizationId: string) {
      return prisma.roadSafetyPesvStep.findMany({ where: { organizationId }, orderBy: { paso: 'asc' } })
    },

    findInventario(organizationId: string) {
      return prisma.roadSafetyInventoryItem.findMany({ where: { organizationId } })
    },

    findVehiculos(organizationId: string) {
      return prisma.roadSafetyVehicle.findMany({ where: { organizationId }, orderBy: { placa: 'asc' } })
    },

    findConductores(organizationId: string) {
      return prisma.roadSafetyDriver.findMany({ where: { organizationId }, orderBy: { nombre: 'asc' } })
    },

    findRutas(organizationId: string) {
      return prisma.roadSafetyRoute.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        include: { puntos: { orderBy: { orden: 'asc' } } },
      })
    },
  }
}

async function upsertPesvPaso(tx: Tx, organizationId: string, paso: ParsedPesvPaso) {
  await tx.roadSafetyPesvStep.upsert({
    where: { organizationId_paso: { organizationId, paso: paso.paso } },
    create: { organizationId, ...paso },
    update: {
      fase: paso.fase,
      elemento: paso.elemento,
      nivelAplicable: paso.nivelAplicable,
      cumplimiento: paso.cumplimiento,
      porcentajeAvance: paso.porcentajeAvance,
      evidencia: paso.evidencia,
      observaciones: paso.observaciones,
    },
  })
}

async function upsertInventarioItem(tx: Tx, organizationId: string, item: ParsedInventarioItem) {
  await tx.roadSafetyInventoryItem.upsert({
    where: { organizationId_grupo_concepto: { organizationId, grupo: item.grupo, concepto: item.concepto } },
    create: { organizationId, ...item },
    update: { cantidad: item.cantidad, observaciones: item.observaciones },
  })
}

async function upsertVehiculo(tx: Tx, organizationId: string, vehiculo: ParsedVehiculo) {
  const { placa, ...data } = vehiculo
  await tx.roadSafetyVehicle.upsert({
    where: { organizationId_placa: { organizationId, placa } },
    create: { organizationId, placa, ...data },
    update: data,
  })
}

async function upsertConductor(tx: Tx, organizationId: string, conductor: ParsedConductor) {
  const { documento, ...data } = conductor
  await tx.roadSafetyDriver.upsert({
    where: { organizationId_documento: { organizationId, documento } },
    create: { organizationId, documento, ...data },
    update: data,
  })
}

async function upsertRuta(tx: Tx, organizationId: string, ruta: ParsedRuta) {
  const { idRuta, puntos, ...data } = ruta
  const saved = await tx.roadSafetyRoute.upsert({
    where: { organizationId_idRuta: { organizationId, idRuta } },
    create: { organizationId, idRuta, ...data },
    update: data,
  })
  await tx.roadSafetyRoutePoint.deleteMany({ where: { routeId: saved.id } })
  if (puntos.length > 0) {
    await tx.roadSafetyRoutePoint.createMany({ data: puntos.map((p) => ({ routeId: saved.id, ...p })) })
  }
}

export type RoadSafetyRepository = ReturnType<typeof createRoadSafetyRepository>
