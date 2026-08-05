import type { Prisma, PrismaClient, NonConformityOrigin, NonConformityPriority, NonConformityStatus } from '@prisma/client'

export function createNonConformitiesRepository(prisma: PrismaClient) {
  return {
    findServiceBySlug(slug: string) {
      return prisma.service.findUnique({ where: { slug } })
    },

    /** Vista de cliente (solo lectura) — lista completa sin paginar, nunca
     * incluye lo archivado (borrado suave) por el admin. */
    findByOrgService(organizationId: string, serviceId: string) {
      return prisma.nonConformity.findMany({
        where: { organizationId, serviceId, deletedAt: null },
        orderBy: { fecha: 'desc' },
      })
    },

    /** CRUD admin paginado (pestaña dedicada) — también alimenta el resumen
     * recortado de Hoja 1 · Dashboard pidiendo pageSize chico y
     * sort:'prioridad'. */
    async findByOrgServicePaginated(
      organizationId: string,
      serviceId: string,
      filters: {
        page: number
        pageSize: number
        estado?: NonConformityStatus
        prioridad?: NonConformityPriority
        origen?: NonConformityOrigin
        deletedOnly?: boolean
        sort?: 'fecha' | 'prioridad'
      },
    ) {
      const where: Prisma.NonConformityWhereInput = {
        organizationId,
        serviceId,
        deletedAt: filters.deletedOnly ? { not: null } : null,
        ...(filters.estado ? { estado: filters.estado } : {}),
        ...(filters.prioridad ? { prioridad: filters.prioridad } : {}),
        ...(filters.origen ? { origen: filters.origen } : {}),
      }

      // sort:'prioridad' (usado por el resumen de Hoja 1 · Dashboard, "las
      // más importantes"): el enum ALTA/MEDIA/BAJA no ordena alfabéticamente
      // en el orden de severidad que queremos, así que Prisma no puede
      // hacerlo en el ORDER BY — se trae todo lo que matchea el filtro (el
      // volumen por organización es chico, nunca miles de filas) y se
      // ordena/pagina en JS.
      if (filters.sort === 'prioridad') {
        const PRIORIDAD_RANK: Record<NonConformityPriority, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 }
        const [all, total] = await Promise.all([
          prisma.nonConformity.findMany({ where, orderBy: { fecha: 'desc' } }),
          prisma.nonConformity.count({ where }),
        ])
        const sorted = [...all].sort(
          (a, b) => PRIORIDAD_RANK[a.prioridad] - PRIORIDAD_RANK[b.prioridad] || b.fecha.getTime() - a.fecha.getTime(),
        )
        const start = (filters.page - 1) * filters.pageSize
        return { items: sorted.slice(start, start + filters.pageSize), total }
      }

      const [items, total] = await Promise.all([
        prisma.nonConformity.findMany({
          where,
          orderBy: { fecha: 'desc' },
          skip: (filters.page - 1) * filters.pageSize,
          take: filters.pageSize,
        }),
        prisma.nonConformity.count({ where }),
      ])

      return { items, total }
    },

    /** Borrado suave, escopeado por organización (mismo patrón anti-IDOR
     * que `update`) — nunca elimina la fila, ver comentario del campo
     * `deletedAt` en schema.prisma. */
    softDelete(id: string, organizationId: string) {
      return prisma.nonConformity.updateMany({ where: { id, organizationId }, data: { deletedAt: new Date() } })
    },

    createManual(input: {
      organizationId: string
      serviceId: string
      createdById: string
      descripcion: string
      prioridad: NonConformityPriority
      variableNombre: string
      zona?: string
      workPointId?: string
      estado: NonConformityStatus
    }) {
      return prisma.nonConformity.create({
        data: {
          organizationId: input.organizationId,
          serviceId: input.serviceId,
          createdById: input.createdById,
          descripcion: input.descripcion,
          prioridad: input.prioridad,
          variableNombre: input.variableNombre,
          zona: input.zona,
          workPointId: input.workPointId,
          estado: input.estado,
          origen: 'MANUAL',
        },
      })
    },

    /** Update escopeado por organización — evita que un admin edite una no
     * conformidad de otra empresa adivinando el id (mismo patrón anti-IDOR
     * que el resto del módulo de variables). */
    update(
      id: string,
      organizationId: string,
      data: { descripcion?: string; prioridad?: NonConformityPriority; estado?: NonConformityStatus },
    ) {
      return prisma.nonConformity.updateMany({ where: { id, organizationId }, data })
    },

    /** Una fila AUTO por lectura fuera de norma — `upsert` por `readingId`
     * (único) para que reprocesar la misma carga nunca duplique filas. */
    upsertAuto(input: {
      readingId: string
      organizationId: string
      serviceId: string
      workPointId: string
      variableNombre: string
      zona: string
      prioridad: NonConformityPriority
      descripcion: string
    }) {
      return prisma.nonConformity.upsert({
        where: { readingId: input.readingId },
        create: {
          readingId: input.readingId,
          organizationId: input.organizationId,
          serviceId: input.serviceId,
          workPointId: input.workPointId,
          variableNombre: input.variableNombre,
          zona: input.zona,
          prioridad: input.prioridad,
          descripcion: input.descripcion,
          origen: 'AUTO',
          estado: 'ABIERTA',
        },
        update: {
          variableNombre: input.variableNombre,
          zona: input.zona,
          prioridad: input.prioridad,
          descripcion: input.descripcion,
          estado: 'ABIERTA',
          // Si el admin había archivado esta AUTO y la misma lectura vuelve
          // a salirse de norma, reaparece — el problema real recurrió.
          deletedAt: null,
        },
      })
    },

    /** Si una corrección posterior vuelve VERDE una lectura que tenía una no
     * conformidad automática abierta, se cierra sola — no se borra, para no
     * perder el rastro de que existió. */
    closeAutoForReading(readingId: string) {
      return prisma.nonConformity.updateMany({
        where: { readingId, origen: 'AUTO' },
        data: { estado: 'CERRADA' },
      })
    },

    /** "Alertas activas" de Hoja 1 · Dashboard — mismo alcance (carga
     * seleccionada) que el resto de tarjetas de esa pestaña, no todas las
     * no conformidades históricas de la organización. Las AUTO (ligadas a
     * una lectura vía readingId) se filtran por esa lectura perteneciendo a
     * la carga seleccionada; las MANUAL (sin lectura) no tienen forma de
     * "pertenecer" a una carga, así que se filtran por su propio `fecha`
     * cayendo el mismo día calendario que la fecha de evaluación de esa
     * carga — es la única noción de "rango filtrado" que existe hoy en el
     * dashboard (no hay un filtro de fechas real, solo selección de carga). */
    countActive(organizationId: string, serviceId: string, uploadId: string, fecha: Date) {
      const inicioDia = new Date(fecha)
      inicioDia.setHours(0, 0, 0, 0)
      const finDia = new Date(fecha)
      finDia.setHours(23, 59, 59, 999)

      return prisma.nonConformity.count({
        where: {
          organizationId,
          serviceId,
          deletedAt: null,
          estado: { in: ['ABIERTA', 'EN_SEGUIMIENTO'] },
          OR: [{ reading: { uploadId } }, { readingId: null, fecha: { gte: inicioDia, lte: finDia } }],
        },
      })
    },
  }
}

export type NonConformitiesRepository = ReturnType<typeof createNonConformitiesRepository>
