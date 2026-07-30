import type { Prisma, PrismaClient, WorkShift } from '@prisma/client'

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

    findOrganizationById(id: string) {
      return prisma.organization.findUnique({ where: { id } })
    },

    /** Para el selector de organizaciones del super-admin: solo las que
     * tienen contratado el servicio dado. */
    findOrganizationsByService(serviceId: string) {
      return prisma.organization.findMany({
        where: { isActive: true, services: { some: { serviceId, isActive: true } } },
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
            },
            create: {
              organizationId: input.organizationId,
              codigo,
              nombre: row.nombrePuesto,
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

    /** Actualiza una carga EXISTENTE (misma fecha) en vez de crear una
     * nueva: respeta las lecturas ya corregidas manualmente (isCorrected),
     * actualiza las demás, e inserta como nuevas las combinaciones
     * puesto+variable que no existían en la carga original. Todo en una
     * transacción — todo o nada, igual que createUploadTransaction. */
    async updateUploadTransaction(input: {
      uploadId: string
      organizationId: string
      rows: {
        codigoPuesto: string
        nombrePuesto: string
        areaPlanta: string
        procesoActividad: string
        jornada: WorkShift
        codigoVariable: string
        definitionId: string
        valor: number
        semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
      }[]
    }) {
      return prisma.$transaction(async (tx) => {
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
            },
            create: {
              organizationId: input.organizationId,
              codigo,
              nombre: row.nombrePuesto,
              areaPlanta: row.areaPlanta,
              procesoActividad: row.procesoActividad,
              jornada: row.jornada,
            },
          })
          workPointIdByCodigo.set(codigo, workPoint.id)
        }

        let filasNuevas = 0
        let filasActualizadas = 0
        const filasOmitidas: { workPointCodigo: string; codigoVariable: string }[] = []

        for (const row of input.rows) {
          const workPointId = workPointIdByCodigo.get(row.codigoPuesto)!
          const existing = await tx.variableReading.findUnique({
            where: {
              uploadId_workPointId_definitionId: {
                uploadId: input.uploadId,
                workPointId,
                definitionId: row.definitionId,
              },
            },
          })

          if (existing?.isCorrected) {
            filasOmitidas.push({ workPointCodigo: row.codigoPuesto, codigoVariable: row.codigoVariable })
            continue
          }

          if (existing) {
            await tx.variableReading.update({
              where: { id: existing.id },
              data: { valor: row.valor, semaforo: row.semaforo },
            })
            filasActualizadas++
          } else {
            await tx.variableReading.create({
              data: {
                uploadId: input.uploadId,
                workPointId,
                definitionId: row.definitionId,
                valor: row.valor,
                semaforo: row.semaforo,
              },
            })
            filasNuevas++
          }
        }

        return { filasNuevas, filasActualizadas, filasOmitidas }
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

    /** Busca la carga exacta para esta fecha (org+servicio+fecha) — la
     * clave única de Task 1 garantiza que hay a lo sumo una. Si existe,
     * uploadVariables() actualiza sus lecturas en vez de crear una carga
     * nueva. */
    findUploadByDate(organizationId: string, serviceId: string, fechaEvaluacion: Date) {
      return prisma.variableUpload.findUnique({
        where: { organizationId_serviceId_fechaEvaluacion: { organizationId, serviceId, fechaEvaluacion } },
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
        },
      })
    },
  }
}

export type VariablesRepository = ReturnType<typeof createVariablesRepository>
