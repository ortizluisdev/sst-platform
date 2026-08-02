/**
 * Listas fijas de la plantilla Excel de referencia
 * (registro_seguridad_vial_MSSV_1.xlsx) — extraídas literalmente, no
 * inventadas. Los 8 organismos nacionales y los 24 pasos PESV nunca
 * cambian entre clientes, así que se hardcodean acá en vez de guardarse en
 * la base de datos (evita que un cliente los borre por accidente).
 */

export const INVENTARIO_GRUPOS = ['ACTORES_VIALES', 'PARQUE_AUTOMOTOR', 'COBERTURA_OPERACIONAL'] as const
export type InventarioGrupo = (typeof INVENTARIO_GRUPOS)[number]

export const ACTORES_VIALES_CONCEPTOS = [
  'Peatones (colaboradores que se desplazan a pie)',
  'Ciclistas',
  'Usuarios de monopatín / patineta eléctrica',
  'Motociclistas',
  'Conductores de vehículo liviano',
  'Conductores de vehículo pesado',
  'Operadores de equipo especial (grúa, montacargas)',
  'Pasajeros',
] as const

export const PARQUE_AUTOMOTOR_CONCEPTOS = [
  'Vehículos livianos',
  'Vehículos pesados / carga',
  'Motocicletas',
  'Bicicletas / monopatines (empresa)',
  'Equipo especial (grúas, montacargas)',
] as const

export const COBERTURA_OPERACIONAL_CONCEPTOS = [
  'Sedes',
  'Ciudades con operación',
  'Rutas activas',
  'Km promedio recorridos / mes',
] as const

export const INVENTARIO_CONCEPTOS_POR_GRUPO: Record<InventarioGrupo, readonly string[]> = {
  ACTORES_VIALES: ACTORES_VIALES_CONCEPTOS,
  PARQUE_AUTOMOTOR: PARQUE_AUTOMOTOR_CONCEPTOS,
  COBERTURA_OPERACIONAL: COBERTURA_OPERACIONAL_CONCEPTOS,
}

/** 24 pasos del PESV (Resolución 40595 de 2022), agrupados en 4 fases —
 * `elemento` es el texto por defecto, editable en el Excel (pasos 18 y 19
 * "se ajustan según la matriz y nivel del cliente", ver Leyenda). */
export const PESV_PASOS = [
  { fase: 'F1', paso: 1, elemento: 'Líder del diseño e implementación del PESV', nivelAplicable: 'Todos' },
  { fase: 'F1', paso: 2, elemento: 'Comité de seguridad vial', nivelAplicable: 'Estándar y Avanzado' },
  { fase: 'F1', paso: 3, elemento: 'Política de seguridad vial de la organización', nivelAplicable: 'Todos' },
  { fase: 'F1', paso: 4, elemento: 'Liderazgo, compromiso y corresponsabilidad del nivel directivo', nivelAplicable: 'Todos' },
  { fase: 'F1', paso: 5, elemento: 'Diagnóstico', nivelAplicable: 'Todos' },
  { fase: 'F1', paso: 6, elemento: 'Caracterización, evaluación y control de riesgos', nivelAplicable: 'Todos' },
  { fase: 'F1', paso: 7, elemento: 'Objetivos y metas del PESV', nivelAplicable: 'Todos' },
  { fase: 'F1', paso: 8, elemento: 'Programas de gestión de riesgos críticos y factores de desempeño', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 9, elemento: 'Plan anual de trabajo', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 10, elemento: 'Competencia y plan anual de formación', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 11, elemento: 'Comportamiento humano (selección, documentación y conducta segura)', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 12, elemento: 'Atención a víctimas — protocolo de atención', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 13, elemento: 'Atención a víctimas — investigación de siniestros viales', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 14, elemento: 'Infraestructura segura — desplazamientos y rutas', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 15, elemento: 'Infraestructura segura — instalaciones y entorno físico', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 16, elemento: 'Vehículos seguros — mantenimiento preventivo y correctivo', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 17, elemento: 'Vehículos seguros — inspección y documentación', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 18, elemento: 'Paso adicional Res. 40595 (ajustar denominación según matriz)', nivelAplicable: 'Todos' },
  { fase: 'F2', paso: 19, elemento: 'Paso adicional Res. 40595 (ajustar denominación según matriz)', nivelAplicable: 'Todos' },
  { fase: 'F3', paso: 20, elemento: 'Indicadores y reporte de autogestión PESV', nivelAplicable: 'Todos' },
  { fase: 'F3', paso: 21, elemento: 'Registro y análisis estadístico de siniestros viales', nivelAplicable: 'Avanzado' },
  { fase: 'F3', paso: 22, elemento: 'Auditoría anual', nivelAplicable: 'Todos' },
  { fase: 'F4', paso: 23, elemento: 'Mejora continua, acciones preventivas y correctivas', nivelAplicable: 'Todos' },
  { fase: 'F4', paso: 24, elemento: 'Mecanismos de comunicación y participación', nivelAplicable: 'Todos' },
] as const

export interface OrganismoApoyo {
  entidad: string
  municipio: string
  contacto: string
  telefono1: string
  telefono2: string | null
}

/** 8 organismos de apoyo nacionales — fijos, iguales para cualquier ruta. */
export const ORGANISMOS_APOYO_NACIONALES: OrganismoApoyo[] = [
  { entidad: 'Línea única de emergencias', municipio: 'Nacional', contacto: 'No aplica', telefono1: '123', telefono2: null },
  { entidad: 'Tránsito y transporte', municipio: 'Nacional', contacto: 'No aplica', telefono1: '#767', telefono2: null },
  { entidad: 'Emergencias médicas', municipio: 'Nacional', contacto: 'No aplica', telefono1: '125', telefono2: null },
  { entidad: 'Bomberos', municipio: 'Nacional', contacto: 'No aplica', telefono1: '119', telefono2: null },
  { entidad: 'Cruz Roja', municipio: 'Nacional', contacto: 'No aplica', telefono1: '132', telefono2: null },
  { entidad: 'Defensa Civil', municipio: 'Nacional', contacto: 'No aplica', telefono1: '144', telefono2: null },
  { entidad: 'Policía Nacional', municipio: 'Nacional', contacto: 'No aplica', telefono1: '112', telefono2: null },
  { entidad: 'Gaula del Ejército', municipio: 'Nacional', contacto: 'No aplica', telefono1: '147', telefono2: null },
]

/** Claves fijas de los 4 organismos "Ciudad más cercana" — editables por
 * ruta, se guardan en RoadSafetyRoute.organismosApoyoLocal como JSON. */
export const ORGANISMOS_APOYO_LOCALES_CLAVES = [
  'Línea única de emergencias',
  'Tránsito y transporte',
  'Bomberos',
  'Policía Nacional',
] as const

/** Los 14 checks de "condiciones de riesgo" de la Hoja 4 — clave estable
 * (para el JSON de RoadSafetyRoute.condicionesRiesgo) + etiqueta tal cual
 * el Excel. */
export const CONDICIONES_RIESGO = [
  { clave: 'senalizacionNormas', etiqueta: 'Señalización y normas de tránsito a tener en cuenta' },
  { clave: 'accidentesGeograficos', etiqueta: 'Accidentes geográficos' },
  { clave: 'riesgoPublico', etiqueta: 'Riesgo público' },
  { clave: 'pendientes', etiqueta: 'Pendientes en ascenso / descenso' },
  { clave: 'senalizacionInadecuada', etiqueta: 'Señalización y/o infraestructura vial inadecuada' },
  { clave: 'intervencionesVia', etiqueta: 'Intervenciones en la vía' },
  { clave: 'puenteVehicular', etiqueta: 'Puente vehicular' },
  { clave: 'calzadaSinPavimentar', etiqueta: 'Calzada sin pavimentar / malla vial defectuosa' },
  { clave: 'altoFlujoVehicular', etiqueta: 'Alto flujo vehicular / cruces' },
  { clave: 'curvasPeligrosas', etiqueta: 'Curvas peligrosas' },
  { clave: 'zonasPobladas', etiqueta: 'Zonas pobladas, escolares y/o paso de ciclistas' },
  { clave: 'iluminacionDeficiente', etiqueta: 'Iluminación deficiente' },
  { clave: 'semovientes', etiqueta: 'Presencia de semovientes' },
  { clave: 'naturales', etiqueta: 'Naturales (desbordamientos, deslizamientos)' },
] as const

export type CondicionRiesgoClave = (typeof CONDICIONES_RIESGO)[number]['clave']
