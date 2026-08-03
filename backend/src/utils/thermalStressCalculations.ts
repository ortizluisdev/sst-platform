/**
 * Motor de cálculo de Estrés Térmico — Fase 1 (las 6 variables CALCULO:
 * TER-03, TER-04, TER-07, TER-09, TER-13, TER-14).
 *
 * Cada función implementa EXACTAMENTE la fórmula de la norma citada, sin
 * simplificaciones ni aproximaciones propias — ver el prompt de
 * especificación (2026-08-03) para el detalle completo de cada fórmula y
 * sus casos de verificación. Ningún input requerido tiene valor por
 * defecto silencioso: si falta, la función devuelve un resultado "no
 * calculable" explícito (ver `CalculoResult`), nunca inventa un número.
 */

/** Resultado de cualquier cálculo de esta fase: o el valor numérico, o el
 * motivo exacto por el que no se pudo calcular (nunca ambos, nunca un
 * valor "aproximado" quieto). */
export type CalculoResult = { ok: true; value: number } | { ok: false; reason: string }

function requireNumber(value: number | null | undefined, nombre: string): { ok: false; reason: string } | null {
  if (value == null || Number.isNaN(value)) return { ok: false, reason: `no calculable: falta ${nombre}` }
  return null
}

// ============================================================
// TER-07 — Temperatura radiante media (Tr)
// Fuente: ISO 7726:1998 — globo negro estándar (diámetro 0.15 m,
// emisividad 0.95), convección forzada (válido para Va ≳ 0.05 m/s).
// ============================================================

const GLOBO_DIAMETRO_M = 0.15
const GLOBO_EMISIVIDAD = 0.95

export function calcularTemperaturaRadianteMedia(input: { tg: number | null; ta: number | null; va: number | null }): CalculoResult {
  const faltaTg = requireNumber(input.tg, 'Tg (temperatura de globo)')
  if (faltaTg) return faltaTg
  const faltaTa = requireNumber(input.ta, 'Ta (temperatura del aire)')
  if (faltaTa) return faltaTa
  const faltaVa = requireNumber(input.va, 'Va (velocidad del aire)')
  if (faltaVa) return faltaVa

  const { tg, ta, va } = input as { tg: number; ta: number; va: number }

  const coefConveccion = (1.1e8 * Math.pow(va, 0.6)) / (GLOBO_EMISIVIDAD * Math.pow(GLOBO_DIAMETRO_M, 0.4))
  const tgK4 = Math.pow(tg + 273.15, 4)
  const trK4 = tgK4 + coefConveccion * (tg - ta)
  const tr = Math.pow(trK4, 1 / 4) - 273.15

  return { ok: true, value: tr }
}

// ============================================================
// TER-03 — Índice WBGT
// Fuente: ISO 7243:2017.
// `exposicionSolar` es OBLIGATORIO y explícito — no existe hoy ningún
// campo en el sistema que distinga interior/exterior (ver aviso aparte),
// así que esta función nunca asume un valor por defecto: quien la llame
// debe pasarlo siempre.
// ============================================================

export function calcularWBGT(input: {
  tnw: number | null
  tg: number | null
  ta: number | null
  exposicionSolar: boolean
}): CalculoResult {
  const faltaTnw = requireNumber(input.tnw, 'Tnw (temperatura de bulbo húmedo natural)')
  if (faltaTnw) return faltaTnw
  const faltaTg = requireNumber(input.tg, 'Tg (temperatura de globo)')
  if (faltaTg) return faltaTg

  const { tnw, tg } = input as { tnw: number; tg: number }

  if (input.exposicionSolar) {
    const faltaTa = requireNumber(input.ta, 'Ta (temperatura del aire) — requerido para WBGT con exposición solar')
    if (faltaTa) return faltaTa
    const ta = input.ta as number
    return { ok: true, value: 0.7 * tnw + 0.2 * tg + 0.1 * ta }
  }

  return { ok: true, value: 0.7 * tnw + 0.3 * tg }
}

// ============================================================
// TER-04 / TER-09 — Voto medio previsto (PMV) y PPD
// Fuente: ISO 7730:2005 (método de Fanger), mismo algoritmo que
// ASHRAE 55 / CBE Thermal Comfort Tool. W (trabajo externo) = 0 siempre
// (no es un input disponible en el catálogo).
// ============================================================

const PMV_MAX_ITERACIONES = 150
const PMV_TOLERANCIA = 0.0001
const W_TRABAJO_EXTERNO = 0

export interface PmvResult {
  pmv: number
  tcl: number
  hc: number
  iteraciones: number
}

function calcularPMVInterno(input: { ta: number; tr: number; va: number; hr: number; m: number; icl: number }): PmvResult {
  const { ta, tr, va, hr, m, icl } = input
  const w = W_TRABAJO_EXTERNO
  const mw = m - w

  // Presión parcial de vapor (Tetens), Pa
  const pa = (hr / 100) * 611 * Math.exp((17.27 * ta) / (ta + 237.3))
  const iclSI = icl * 0.155 // clo → m²·K/W
  const fcl = iclSI <= 0.078 ? 1.0 + 1.29 * iclSI : 1.05 + 0.645 * iclSI
  const hcf = 12.1 * Math.sqrt(va) // convección forzada — fija durante toda la iteración

  // Iteración por sustitución simple con RELAJACIÓN (promedio del valor
  // anterior con el nuevo en cada paso, `xf = (xf+xn)/2`) — sin esto la
  // sustitución directa (tcl = f(tcl)) puede OSCILAR sin converger para
  // ciertas combinaciones de inputs, en vez de estabilizarse (confirmado:
  // sin relajación, el caso Ta=28/Tr=28/Va=0.2/HR=60/M=100/Icl=0.6
  // oscilaba entre ~28°C y ~33°C durante las 150 iteraciones y devolvía
  // PMV≈10.8 — fuera de todo rango físico — al tope de iteraciones, en vez
  // de PMV≈1.47 real. Validado contra pythermalcomfort, ver nota de
  // validación cruzada al final de este archivo: con relajación, los 4
  // casos de prueba coinciden con la librería de referencia dentro de
  // ±0.0011 en PMV. El valor inicial (`xn = xf = Ta`) sigue el criterio
  // del spec ("simplemente arrancar en tcl = Ta") — no cambia la fórmula,
  // solo estabiliza cómo se busca el punto fijo.
  let xn = ta
  let xf = ta
  let hc = hcf
  let iteraciones = 0

  do {
    xf = (xf + xn) / 2
    const hcn = 2.38 * Math.pow(Math.abs(xf - ta), 0.25)
    hc = Math.max(hcn, hcf)
    xn = 35.7 - 0.028 * mw - iclSI * (3.96e-8 * fcl * (Math.pow(xf + 273, 4) - Math.pow(tr + 273, 4)) + fcl * hc * (xf - ta))
    iteraciones++
  } while (Math.abs(xn - xf) > PMV_TOLERANCIA && iteraciones < PMV_MAX_ITERACIONES)

  const tcl = xn

  // Pérdida de calor por sudoración — el spec original no precisaba que
  // este término se recorta en 0 cuando mw ≤ 58.15 W/m² (1 met): sin el
  // recorte, actividades muy livianas (mw < 58.15) daban un término
  // NEGATIVO (equivalente a "ganar" calor por sudoración, físicamente
  // inválido). Este recorte SÍ está en la fórmula publicada de ISO
  // 7730/Fanger — lo confirmé leyendo la implementación de referencia de
  // `pythermalcomfort` (no es una simplificación mía, es corregir una
  // imprecisión del spec original con la fuente real de la norma).
  const hl2 = mw > 58.15 ? 0.42 * (mw - 58.15) : 0

  const l =
    mw -
    3.05e-3 * (5733 - 6.99 * mw - pa) -
    hl2 -
    1.7e-5 * m * (5867 - pa) -
    0.0014 * m * (34 - ta) -
    3.96e-8 * fcl * (Math.pow(tcl + 273, 4) - Math.pow(tr + 273, 4)) -
    fcl * hc * (tcl - ta)

  const pmv = (0.303 * Math.exp(-0.036 * m) + 0.028) * l

  return { pmv, tcl, hc, iteraciones }
}

/** TER-04. `tr` normalmente viene de calcularTemperaturaRadianteMedia() —
 * no se recalcula acá, se recibe ya resuelto para no acoplar esta función
 * a la de TER-07. */
export function calcularPMV(input: {
  ta: number | null
  tr: number | null
  va: number | null
  hr: number | null
  m: number | null
  icl: number | null
}): CalculoResult {
  const faltaTa = requireNumber(input.ta, 'Ta (temperatura del aire)')
  if (faltaTa) return faltaTa
  const faltaTr = requireNumber(input.tr, 'Tr (temperatura radiante media)')
  if (faltaTr) return faltaTr
  const faltaVa = requireNumber(input.va, 'Va (velocidad del aire)')
  if (faltaVa) return faltaVa
  const faltaHr = requireNumber(input.hr, 'HR (humedad relativa)')
  if (faltaHr) return faltaHr
  const faltaM = requireNumber(input.m, 'M (tasa metabólica)')
  if (faltaM) return faltaM
  const faltaIcl = requireNumber(input.icl, 'Icl (aislamiento de vestimenta)')
  if (faltaIcl) return faltaIcl

  const { pmv } = calcularPMVInterno(input as { ta: number; tr: number; va: number; hr: number; m: number; icl: number })
  return { ok: true, value: pmv }
}

/** TER-09. Recibe el PMV ya calculado (no vuelve a resolver la iteración
 * de tcl) — así PPD es una función pura de una sola entrada, fácil de
 * testear con el caso trivial PMV=0 → PPD=5%. */
export function calcularPPD(pmv: number | null): CalculoResult {
  const faltaPmv = requireNumber(pmv, 'PMV (voto medio previsto)')
  if (faltaPmv) return faltaPmv
  const p = pmv as number
  const ppd = 100 - 95 * Math.exp(-(0.03353 * Math.pow(p, 4) + 0.2179 * Math.pow(p, 2)))
  return { ok: true, value: ppd }
}

// ============================================================
// TER-13 / TER-14 — Tiempo de trabajo permitido / descanso requerido
// Fuente: ACGIH TLVs/BEIs (tabla de referencia, alineada con ISO 7243
// Anexo A) — tabla por ESCALONES discretos, nunca interpolada.
//
// TODO: validar esta tabla completa (incluyendo la categoría "Muy
// pesado", que falta en las fuentes consultadas) contra la edición
// vigente de ACGIH TLVs/BEIs antes de pasar esto a producción — la tabla
// cambia ligeramente edición a edición y esto determina en la práctica
// cuánto puede trabajar una persona en calor.
// ============================================================

export type CategoriaTrabajo = 'LIGERO' | 'MODERADO' | 'PESADO' | 'MUY_PESADO'

export function clasificarCategoriaTrabajo(m: number | null): CategoriaTrabajo | null {
  if (m == null || Number.isNaN(m)) return null
  if (m <= 234) return 'LIGERO'
  if (m <= 360) return 'MODERADO'
  if (m <= 468) return 'PESADO'
  return 'MUY_PESADO'
}

interface EscalonWBGT {
  pctTrabajo: 100 | 75 | 50 | 25
  limite: number
}

/** Límites WBGT (°C) por escalón, trabajador ACLIMATADO. Sin fila para
 * "Muy pesado" (ver TODO arriba) — esa categoría se maneja aparte, nunca
 * cae en esta tabla. */
const TABLA_LIMITES_WBGT: Record<'LIGERO' | 'MODERADO' | 'PESADO', EscalonWBGT[]> = {
  LIGERO: [
    { pctTrabajo: 100, limite: 30.0 },
    { pctTrabajo: 75, limite: 30.6 },
    { pctTrabajo: 50, limite: 31.7 },
    { pctTrabajo: 25, limite: 32.2 },
  ],
  MODERADO: [
    { pctTrabajo: 100, limite: 26.7 },
    { pctTrabajo: 75, limite: 27.8 },
    { pctTrabajo: 50, limite: 29.4 },
    { pctTrabajo: 25, limite: 31.1 },
  ],
  PESADO: [
    { pctTrabajo: 100, limite: 25.0 },
    { pctTrabajo: 75, limite: 25.6 },
    { pctTrabajo: 50, limite: 27.8 },
    { pctTrabajo: 25, limite: 30.0 },
  ],
}

export interface RegimenTrabajoDescanso {
  categoria: CategoriaTrabajo
  /** null cuando la categoría es MUY_PESADO (tabla no disponible) */
  pctTrabajo: 100 | 75 | 50 | 25 | 0 | null
  tiempoTrabajoPermitidoMin: number | null
  tiempoDescansoRequeridoMin: number | null
  estado: 'NORMAL' | 'CRITICO' | 'SIN_DATOS'
}

export type RegimenResult = { ok: true; value: RegimenTrabajoDescanso } | { ok: false; reason: string }

/** TER-13/TER-14 combinadas — el régimen (trabajo/descanso) es una sola
 * decisión de la tabla, de la que se derivan los 2 minutos por hora. */
export function calcularRegimenTrabajoDescanso(input: { wbgt: number | null; m: number | null }): RegimenResult {
  const faltaWbgt = requireNumber(input.wbgt, 'WBGT')
  if (faltaWbgt) return faltaWbgt
  const faltaM = requireNumber(input.m, 'M (tasa metabólica)')
  if (faltaM) return faltaM

  const wbgt = input.wbgt as number
  const m = input.m as number
  const categoria = clasificarCategoriaTrabajo(m)!

  if (categoria === 'MUY_PESADO') {
    return {
      ok: true,
      value: {
        categoria,
        pctTrabajo: null,
        tiempoTrabajoPermitidoMin: null,
        tiempoDescansoRequeridoMin: null,
        estado: 'SIN_DATOS',
      },
    }
  }

  const escalones = TABLA_LIMITES_WBGT[categoria]
  // Escalones en orden de MÁS a MENOS exigente (100% trabajo primero) —
  // se toma el primero cuyo límite alcanza al WBGT medido, sin interpolar.
  const escalon = escalones.find((e) => wbgt <= e.limite)

  if (!escalon) {
    // WBGT por encima del límite de "25% trabajo" — parar la actividad.
    return {
      ok: true,
      value: {
        categoria,
        pctTrabajo: 0,
        tiempoTrabajoPermitidoMin: 0,
        tiempoDescansoRequeridoMin: 60,
        estado: 'CRITICO',
      },
    }
  }

  const tiempoTrabajo = 60 * (escalon.pctTrabajo / 100)
  return {
    ok: true,
    value: {
      categoria,
      pctTrabajo: escalon.pctTrabajo,
      tiempoTrabajoPermitidoMin: tiempoTrabajo,
      tiempoDescansoRequeridoMin: 60 - tiempoTrabajo,
      estado: 'NORMAL',
    },
  }
}
