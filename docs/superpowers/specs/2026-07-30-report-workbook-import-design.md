# Importador del reporte Excel completo (Reporte Hoja 2) sin errores

**Fecha:** 2026-07-30
**Estado:** Aprobado
**Alcance:** solo esto — Hoja 1 (KPIs) y Hoja 3 (Análisis) quedan como sub-proyectos aparte, sin tocar en este cambio.

## Contexto

El usuario tiene el archivo `variablesdash1 (1).xlsx` (workbook de 6 hojas: Dashboard, Hoja 2 · Detalle técnico, Hoja 3 · Análisis, Reporte Hoja 1, Reporte Hoja 2, Leyenda) y necesita poder subirlo directamente al sistema, sin reformatear nada, y que la carga se procese sin error.

**Hallazgo clave:** la hoja con datos reales medidos es **"Reporte Hoja 2"** (columnas: Variable, Símbolo, Resultado, Unidad, Referencia/norma, Tipo, Estado, agrupada por categoría) — no "Hoja 2 · Detalle técnico" (que es solo la estructura del catálogo, sin valores, ya usada en el sub-proyecto de migración del catálogo).

## Requisitos confirmados con el usuario

- La fecha de evaluación es la fecha de la subida (hoy), no se pide ni se parsea del Excel.
- El puesto de trabajo es uno solo por organización, representando la evaluación completa (nombre derivado de "Empresa / Razón social" de Reporte Hoja 1).
- Los nombres de variable del Excel no calzan 1:1 con los del catálogo en todos los casos — se resuelven con una tabla de equivalencias fija.
- Las filas sin equivalente en el catálogo, o con un "Resultado" no numérico, se omiten y se reportan — **nunca rechazan el archivo completo**. Esto es lo que garantiza que la carga del archivo real del usuario nunca falle.

## Tabla de equivalencias de nombres (Reporte Hoja 2 → catálogo)

Coincidencias que necesitan alias (nombre del Excel ≠ nombre exacto del catálogo):

| Nombre en Reporte Hoja 2 | Código de catálogo | Nombre real en catálogo |
|---|---|---|
| Deslumbramiento unificado | ILU-03 | Deslumbramiento unificado (UGR) |
| Luminancia superficie | ILU-11 | Luminancia |
| Reflectancia pared (vertical) | ILU-09 | Reflectancia pared |
| Nivel pico (C) | RUI-02 | Nivel pico (LC,pico) |
| Atenuación de protector | RUI-10 | Atenuación de protector auditivo |
| Temperatura del aire | TER-01 | Temperatura del aire (bulbo seco) |
| Bulbo húmedo natural | TER-06 | Temperatura de bulbo húmedo natural |
| Voto medio previsto | TER-04 | Voto medio previsto (PMV) |
| Insatisfechos | TER-09 | Porcentaje previsto de insatisfechos (PPD) |
| Exposición diaria mano-brazo | VIB-06 | Exposición diaria mano-brazo (A(8)) |
| Exposición diaria cuerpo entero | VIB-08 | Exposición diaria cuerpo entero (A(8)) |
| Valor de dosis de vibración | VIB-09 | Valor de dosis de vibración (VDV) |

Todas las demás filas del Excel coinciden con el nombre exacto del catálogo (ej. "Iluminancia horizontal media", "Uniformidad", "Índice WBGT", etc. — mismo texto).

**Filas que se omiten (sin código de catálogo equivalente, verificado contra el archivo real):**
- "Iluminancia vertical 0.0 m" / "1.0 m" / "1.5 m" — el catálogo tiene una sola variable genérica de iluminancia vertical, sin desglose por altura; serían 3 candidatas para 1 solo slot, ambiguo.
- "Percentil L10" / "L50" / "L90" — el catálogo los combina en una sola variable "Percentiles estadísticos (L10/L50/L90)"; mismo problema de ambigüedad.

**Filas que se omiten por valor no numérico** (detectado con `Number(resultado)` siendo `NaN` — cubre cualquier caso futuro, no una lista fija): "Espectro bandas de octava" (perfil), "Régimen trabajo/descanso" (45/15), "Irradiancia UV-A/B/C" (perfil). El caso "+1.0" (Voto medio previsto) SÍ es numérico (`Number("+1.0")` → `1`), no se omite.

Con el archivo real del usuario, esto produce: **36 lecturas importadas, 9 filas omitidas con motivo, 0 errores** — el archivo se procesa siempre, incluso con estas 9 filas sin mapeo perfecto.

## Modelo de datos

Un campo nuevo, aditivo:

```prisma
enum VariableUploadOrigen {
  CSV
  REPORTE_EXCEL
}

model VariableUpload {
  // ...campos existentes...
  origen VariableUploadOrigen @default(CSV) @map("origen")
}
```

Permite distinguir en Historial qué mecanismo generó cada carga. Default `CSV` para no romper cargas existentes.

## Backend

Nuevo parser `parseVariableReportWorkbook(buffer)` en `backend/src/utils/` (archivo separado del parser CSV existente, mismo patrón de un archivo por responsabilidad). Lee la hoja "Reporte Hoja 2": recorre cada bloque de categoría (delimitado por la fila con el nombre de categoría repetido en las 7 columnas, seguida de la fila de encabezados "Variable/Símbolo/Resultado/.../Estado"), y por cada fila de datos:
1. Busca el nombre en la tabla de equivalencias de esa categoría; si no está, usa el nombre tal cual.
2. Busca el código de catálogo correspondiente (por categoría + nombre resuelto).
3. Si no hay código, o `Number(resultado)` es `NaN` → agrega a la lista de omitidas con el motivo.
4. Si hay código y el resultado es numérico → produce una fila `{ codigoVariable, valor }`.

También lee "Reporte Hoja 1" para extraer "Empresa / Razón social" (celda B5) y construir el nombre del puesto de trabajo único (`"Evaluación general — " + empresa`, o `"Evaluación general"` si la celda está vacía). El código de ese puesto es fijo por organización: `EVAL-GENERAL`.

`uploadVariables()` (servicio existente) intenta primero `parseVariableFile()` (formato plano CSV); si falla específicamente por columnas faltantes, intenta `parseVariableReportWorkbook()`. Si ambos fallan, se devuelve el error de columnas faltantes (comportamiento actual). La fecha de evaluación pasa a ser `new Date()` (fecha de la subida) en vez de un valor recibido del formulario, cuando el archivo se reconoce como el formato de reporte.

La respuesta de carga gana `filasOmitidas: { nombre: string; motivo: 'sin_variable_equivalente' | 'valor_no_numerico' }[]` (formato análogo al ya construido para la re-carga con lecturas corregidas).

## Frontend

- Texto de ayuda bajo "Cargar variables (CSV o Excel)" se actualiza para mencionar que también acepta el reporte completo de Excel.
- El resultado de la carga muestra las filas omitidas (si las hay) con su motivo — mismo componente/patrón que ya existe para mostrar el resultado de la carga.
- No se agrega selector de fecha para este formato (se detecta automáticamente y usa la fecha de hoy) — el campo de fecha existente sigue funcionando igual para el formato CSV plano.

## Fuera de alcance

- Hoja 1 (KPIs globales) y Hoja 3 (Análisis) — sub-proyectos aparte.
- Cualquier intento de resolver las 6 filas ambiguas (alturas de iluminancia, percentiles) inventando una regla de selección — quedan omitidas hasta que el cliente final aclare qué hacer con ellas.

## Verificación

Sin suite de tests automatizada — `npm run typecheck` + subir el archivo real del usuario (`variablesdash1 (1).xlsx`) contra el backend:

1. Confirmar HTTP 201 (no error), con `filasNuevas` reflejando las 36 lecturas mapeables.
2. Confirmar `filasOmitidas` reporta exactamente las 9 filas esperadas con su motivo.
3. Confirmar en el dashboard (categoría por categoría) que los valores importados coinciden con los del Excel (ej. Iluminancia horizontal media = 485 lux).
4. Confirmar que el puesto de trabajo "Evaluación general — SAFEHAND S.A.S." aparece en el detalle por punto de trabajo.
5. Confirmar en base de datos (no en UI — no se agrega columna de origen a Historial en este cambio) que la carga quedó con `origen: REPORTE_EXCEL`.
