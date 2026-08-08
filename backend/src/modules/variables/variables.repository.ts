import { Prisma, type PrismaClient, type WorkShift } from '@prisma/client'
import { CATEGORIA_ENUM_TO_LABEL } from '../../utils/higieneCategorias.js'

export function createVariablesRepository(prisma: PrismaClient) {
  return {
    findServiceBySlug(slug: string) {
      return prisma.service.findUnique({ where: { slug } })
    },

    findOrganizationService(organizationId: string, serviceId: string) {
      return prisma.organizationService.findUnique({
        where: { organizationId_serviceId: { organizationId, serviceId } },
      })
    },

    findDefinitionsByService(serviceId: string) {
      return prisma.variableDefinition.findMany({ where: { serviceId, isActive: true } })
    },

    /** Labels (`VariableDefinition.categoria`) de las categorías de Higiene
     * Industrial deshabilitadas para esta organización — se venden por
     * separado (2026-08, "Catálogo de variables por categoría"). Cualquier
     * categoría que no sea una de las 5 conocidas (otros servicios) nunca
     * aparece aquí, así que nunca se filtra por error. */
    async findDisabledCategoryLabels(organizationId: string): Promise<Set<string>> {
      const rows = await prisma.organizationCategoryConfig.findMany({
        where: { organizationId, habilitada: false },
      })
      return new Set(rows.map((r) => CATEGORIA_ENUM_TO_LABEL[r.categoria]))
    },

    findOrganizationById(id: string) {
      return prisma.organization.findUnique({ where: { id } })
    },

    findZonaById(id: string, organizationId: string) {
      return prisma.orgZona.findFirst({ where: { id, organizationId, isActive: true } })
    },

    findSeccionById(id: string, organizationId: string) {
      return prisma.orgSeccion.findFirst({ where: { id, organizationId, isActive: true } })
    },

    findCargoById(id: string, organizationId: string) {
      return prisma.orgCargo.findFirst({ where: { id, organizationId, isActive: true } })
    },

    findTrabajadorById(id: string, organizationId: string) {
      return prisma.orgTrabajador.findFirst({ where: { id, organizationId, isActive: true } })
    },

    /** Para el selector de organizaciones del super-admin: solo las que
     * tienen contratado el servicio dado. */
    findOrganizationsByService(serviceId: string) {
      return prisma.organization.findMany({
        where: { isActive: true, deletedAt: null, services: { some: { serviceId, isActive: true } } },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      })
    },

    /** Para los sub-tabs de "Operación" (Fase C): todos los servicios que
     * esta organización tiene contratados y activos, sin importar cuál. */
    findContractedServices(organizationId: string) {
      return prisma.organizationService.findMany({
        where: { organizationId, isActive: true },
        select: { service: { select: { slug: true, nombre: true } } },
        orderBy: { service: { nombre: 'asc' } },
      })
    },

    /** Crea la carga completa (upload + upsert de work points + readings)
     * en una única transacción — todo o nada. */
    async createUploadTransaction(input: {
      organizationId: string
      serviceId: string
      uploadedById: string
      originalFile: string
      fechaEvaluacion: Date
      origen: 'CSV' | 'REPORTE_EXCEL'
      zonaId: string
      seccionId: string
      cargoId: string
      trabajadorId: string
      /** Aplica a TODOS los puestos de trabajo de esta carga — ver nota en
       * variables.service.ts. */
      exposicionSolar: boolean
      omittedRows: { nombre: string; motivo: string }[] | null
      missingVariables: { codigo: string; nombre: string }[] | null
      rows: {
        codigoPuesto: string
        nombrePuesto: string
        areaPlanta: string
        procesoActividad: string
        jornada: WorkShift
        definitionId: string
        valor: number
        semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
      }[]
    }) {
      return prisma.$transaction(async (tx) => {
        const upload = await tx.variableUpload.create({
          data: {
            organizationId: input.organizationId,
            serviceId: input.serviceId,
            uploadedById: input.uploadedById,
            originalFile: input.originalFile,
            fechaEvaluacion: input.fechaEvaluacion,
            origen: input.origen,
            status: 'PROCESADO',
            zonaId: input.zonaId,
            seccionId: input.seccionId,
            cargoId: input.cargoId,
            trabajadorId: input.trabajadorId,
            omittedRows: input.omittedRows ?? undefined,
            missingVariables: input.missingVariables ?? undefined,
          },
        })

        const workPointIdByCodigo = new Map<string, string>()
        const uniqueCodes = [...new Set(input.rows.map((r) => r.codigoPuesto))]
        for (const codigo of uniqueCodes) {
          const row = input.rows.find((r) => r.codigoPuesto === codigo)!
          const workPoint = await tx.workPoint.upsert({
            where: { organizationId_codigo: { organizationId: input.organizationId, codigo } },
            update: {
              nombre: row.nombrePuesto,
              areaPlanta: row.areaPlanta,
              procesoActividad: row.procesoActividad,
              jornada: row.jornada,
              exposicionSolar: input.exposicionSolar,
            },
            create: {
              organizationId: input.organizationId,
              codigo,
              nombre: row.nombrePuesto,
              exposicionSolar: input.exposicionSolar,
              areaPlanta: row.areaPlanta,
              procesoActividad: row.procesoActividad,
              jornada: row.jornada,
            },
          })
          workPointIdByCodigo.set(codigo, workPoint.id)
        }

        await tx.variableReading.createMany({
          data: input.rows.map((r) => ({
            uploadId: upload.id,
            workPointId: workPointIdByCodigo.get(r.codigoPuesto)!,
            definitionId: r.definitionId,
            valor: r.valor,
            semaforo: r.semaforo,
          })),
        })

        return upload
      })
    },

    createAuditLog(input: {
      userId: string
      organizationId: string
      action: 'VARIABLES_UPLOADED' | 'VARIABLE_READING_CORRECTED'
      metadata: Prisma.InputJsonObject
      ipAddress?: string
    }) {
      return prisma.auditLog.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          action: input.action,
          metadata: input.metadata,
          ipAddress: input.ipAddress,
        },
      })
    },

    findLatestUpload(organizationId: string, serviceId: string) {
      return prisma.variableUpload.findFirst({
        where: { organizationId, serviceId, status: 'PROCESADO' },
        orderBy: { fechaEvaluacion: 'desc' },
      })
    },

    findReadingsByUpload(uploadId: string) {
      return prisma.variableReading.findMany({
        where: { uploadId },
        include: { definition: true, workPoint: true },
      })
    },

    /** Trae la lectura con su definición (para recalcular el semáforo) y el
     * organizationId real de su carga (para la verificación anti-IDOR en el
     * servicio — nunca confiar en el organizationId de la ruta sin cruzarlo). */
    findReadingById(readingId: string) {
      return prisma.variableReading.findUnique({
        where: { id: readingId },
        include: {
          definition: true,
          workPoint: { select: { nombre: true, codigo: true, areaPlanta: true } },
          upload: { select: { organizationId: true } },
        },
      })
    },

    correctReading(
      readingId: string,
      data: {
        valor: number
        semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
        correctedById: string
        correctionReason: string
      },
    ) {
      return prisma.variableReading.update({
        where: { id: readingId },
        data: {
          valor: data.valor,
          semaforo: data.semaforo,
          isCorrected: true,
          correctedAt: new Date(),
          correctedById: data.correctedById,
          correctionReason: data.correctionReason,
        },
      })
    },

    /** Lecturas de una carga con definición+puesto completos — usado tras
     * procesar el archivo para sincronizar las no conformidades automáticas
     * (ver nonConformities.service.ts). Separado de createUploadTransaction
     * porque esta no necesita vivir dentro de la transacción: es un efecto
     * secundario posterior, mismo patrón que las notificaciones. */
    findReadingsForUpload(uploadId: string) {
      return prisma.variableReading.findMany({
        where: { uploadId },
        include: { definition: true, workPoint: true },
      })
    },

    /** Todas las cargas procesadas de un servicio/organización, con sus
     * lecturas — usado para la gráfica de tendencia temporal. */
    findUploadsWithReadings(organizationId: string, serviceId: string) {
      return prisma.variableUpload.findMany({
        where: { organizationId, serviceId, status: 'PROCESADO' },
        orderBy: { fechaEvaluacion: 'asc' },
        include: { readings: { include: { definition: true } } },
      })
    },

    countActiveWorkPoints(organizationId: string) {
      return prisma.workPoint.count({ where: { organizationId, isActive: true } })
    },

    /** Historial de cargas para la pestaña Historial — orden más reciente primero. */
    findUploadHistory(organizationId: string, serviceId: string) {
      return prisma.variableUpload.findMany({
        where: { organizationId, serviceId },
        orderBy: { fechaEvaluacion: 'desc' },
        include: {
          uploadedBy: { select: { nombre: true } },
          readings: { select: { workPointId: true } },
          zona: { select: { nombre: true } },
          seccion: { select: { nombre: true } },
          cargo: { select: { nombre: true } },
          trabajador: { select: { nombre: true } },
        },
      })
    },

    /** Una carga puntual con el detalle completo de sus lecturas, para el
     * drill-down del historial. `organizationId` se exige en el where para
     * que un cliente nunca pueda pedir el detalle de otra organización
     * simplemente adivinando el uploadId. */
    findUploadDetail(uploadId: string, organizationId: string) {
      return prisma.variableUpload.findFirst({
        where: { id: uploadId, organizationId },
        include: {
          uploadedBy: { select: { nombre: true } },
          readings: { include: { definition: true, workPoint: true } },
          zona: { select: { nombre: true } },
          seccion: { select: { nombre: true } },
          cargo: { select: { nombre: true } },
          trabajador: { select: { nombre: true } },
        },
      })
    },
  }
}

export type VariablesRepository = ReturnType<typeof createVariablesRepository>
