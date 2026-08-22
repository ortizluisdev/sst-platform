/** Una "hoja" del sidebar cliente — número/etiqueta de la nomenclatura
 * "Hoja N · Nombre" pedida por el product owner (ver spec 2026-08-05). */
export interface ClientSheetDef {
  /** Valor interno: `activeHoja` (Higiene Industrial) o `activeTab`
   * (Seguridad Vial). NUNCA cambia al renumerar — solo cambia `number`. */
  key: string
  /** 1-based, contiguo dentro de cada servicio (incluye el nodo "Dashboard"
   * cuando aplica). */
  number: number
  /** Clave i18n → "Hoja N · Nombre" completo, para el encabezado grande
   * (SectionTitleBanner). */
  labelKey: string
  /** Clave i18n → "Hoja N" corto (o "Dashboard" para el nodo padre), para
   * el ítem del sidebar. */
  shortLabelKey: string
}

export interface ClientServiceSheetsConfig {
  serviceSlug: string
  /** 'substate': Hoja 1 ES la pestaña "Dashboard" (`resumen`); Hoja 2..N son
   *  un sub-estado interno de esa misma pestaña (Higiene Industrial hoy,
   *  `v-model:active-hoja`). `sheets` cubre SOLO las hojas (3 en Higiene),
   *  el nodo padre ('resumen') no forma parte de `sheets`.
   *
   *  'realtabs': cada hoja (incluida Hoja 1 = "Dashboard") es una pestaña
   *  real e independiente (Seguridad Vial hoy, `v-model` normal). `sheets[0]`
   *  es siempre el nodo padre clickeable del acordeón; `sheets.slice(1)` es
   *  el submenú anidado. */
  mode: 'substate' | 'realtabs'
  sheets: ClientSheetDef[]
}

export const CLIENT_SHEETS_CONFIG: Record<string, ClientServiceSheetsConfig> = {
  'higiene-industrial': {
    serviceSlug: 'higiene-industrial',
    mode: 'substate',
    sheets: [
      { key: 'hoja1', number: 1, labelKey: 'dashboard.clientTabs.hoja1', shortLabelKey: 'dashboard.clientTabs.hoja1Short' },
      { key: 'hoja2', number: 2, labelKey: 'dashboard.clientTabs.hoja2', shortLabelKey: 'dashboard.clientTabs.hoja2Short' },
      { key: 'hoja3', number: 3, labelKey: 'dashboard.clientTabs.hoja3', shortLabelKey: 'dashboard.clientTabs.hoja3Short' },
    ],
  },
  'seguridad-vial': {
    serviceSlug: 'seguridad-vial',
    mode: 'realtabs',
    sheets: [
      { key: 'dashboard', number: 1, labelKey: 'roadSafety.tabs.dashboard', shortLabelKey: 'roadSafety.tabs.dashboardShort' },
      { key: 'resumen', number: 2, labelKey: 'roadSafety.tabs.resumen', shortLabelKey: 'roadSafety.tabs.resumenShort' },
      { key: 'hoja1', number: 3, labelKey: 'roadSafety.tabs.hoja1', shortLabelKey: 'roadSafety.tabs.hoja1Short' },
      { key: 'hoja2', number: 4, labelKey: 'roadSafety.tabs.hoja2', shortLabelKey: 'roadSafety.tabs.hoja2Short' },
      { key: 'hoja3', number: 5, labelKey: 'roadSafety.tabs.hoja3', shortLabelKey: 'roadSafety.tabs.hoja3Short' },
      { key: 'hoja4', number: 6, labelKey: 'roadSafety.tabs.hoja4', shortLabelKey: 'roadSafety.tabs.hoja4Short' },
    ],
  },
}
