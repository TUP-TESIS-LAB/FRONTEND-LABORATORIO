# Estándar de fechas `dd/mm/yyyy` en Muestras — Design

> **Jira:** _a crear con `jira-workflow` al cerrar el plan (regla #1/#3 del CLAUDE.md)._
> **Fecha:** 2026-06-19 · **Rama:** `feat/estandar-fechas-muestras` (desde `development` d372c92)

## Problema

En la pantalla de Muestras (`features/analitica/muestras`) y sus subpantallas las fechas se renderizan de forma inconsistente:

- `tube.model.ts` arma `date` a mano como `dd/mm` **sin año** (`${two(getDate())}/${two(getMonth()+1)}`) y `time` como `HH:mm`, ambos strings pre-formateados en el view-model.
- `validacion-protocolos.page.html` usa el `DatePipe` nativo con `'dd/MM/yyyy'` + `'HH:mm'`.

Resultado: dos formatos conviviendo (uno sin año), y el formato decidido en el modelo en lugar del template. No hay una única fuente de verdad.

Ya existe el estándar deseado: el pipe `DateEsPipe` (`shared/pipes/date-es.pipe.ts`) que produce `dd/mm/yyyy` vía `Intl.DateTimeFormat('es-AR')`, pero no se usa en muestras.

## Objetivo

Todas las fechas de Muestras y subpantallas se ven en `dd/mm/yyyy`. Donde hoy se muestra la hora, se mantiene como `dd/mm/yyyy HH:mm` (o la fecha y la hora por separado con el mismo formato). Una sola fuente de formato: el pipe.

## Decisión de diseño

**Centralizar el formato en `DateEsPipe`** (enfoque elegido sobre el "mínimo" de solo agregar el año al string del modelo). El pedido es *dejar un estándar*, lo que implica un único lugar de formato y modelos que cargan la fecha cruda.

### 1. Extender `DateEsPipe`

`shared/pipes/date-es.pipe.ts`, nombre `dateEs`, standalone. Acepta un modo opcional:

| Uso | Salida |
|---|---|
| `value \| dateEs` | `dd/mm/yyyy` (default, sin cambios respecto a hoy) |
| `value \| dateEs:'datetime'` | `dd/mm/yyyy HH:mm` |
| `value \| dateEs:'time'` | `HH:mm` |

- Acepta `string` (ISO) `| Date | null | undefined`; null/undefined/valor inválido → `''`.
- Locale `es-AR`, hora 24h.
- Un `Intl.DateTimeFormat` cacheado por modo (no recrear por llamada).
- `transform(value, mode: 'date' | 'datetime' | 'time' = 'date')`.

### 2. View-model con fecha cruda

En `Sample` (`muestras/models/sample.model.ts`) se reemplazan los strings pre-formateados `date: string` + `time: string` por un único campo crudo `receivedAt: string` (ISO).

- `groupTubes` (`muestras/models/tube.model.ts`) deja de pre-formatear: asigna `receivedAt: latest.updatedAt`. Se elimina el helper `two()` si no queda otro uso.
- El formato pasa 100% al template vía `dateEs`.

### 3. Sweep de templates (preservando el layout "fecha · hora")

| Archivo | Antes | Después |
|---|---|---|
| `components/sample-table/sample-table.component.html` | `{{ row.date }} · {{ row.time }}` | `{{ row.receivedAt \| dateEs }} · {{ row.receivedAt \| dateEs:'time' }}` |
| `components/transito/sample-row/sample-row.component.html` | `{{ sample.date }} · {{ sample.time }}` | `{{ sample.receivedAt \| dateEs }} · {{ sample.receivedAt \| dateEs:'time' }}` |
| `pages/procesamiento/procesamiento.page.html` | `{{ t.date }}` + `{{ t.time }} hs` | `{{ t.receivedAt \| dateEs }}` + `{{ t.receivedAt \| dateEs:'time' }} hs` |
| `pages/validacion-protocolos/validacion-protocolos.page.html` | `\| date:'dd/MM/yyyy'` + `\| date:'HH:mm' hs` | `\| dateEs` + `\| dateEs:'time' hs` |

- Importar `DateEsPipe` en cada componente que lo use; quitar el import de `DatePipe` en `validacion-protocolos`.
- El plan debe **listar exhaustivamente** todo constructor/consumidor de `Sample.date`/`Sample.time` (grep en `features/analitica/muestras`) y migrarlo a `receivedAt` + pipe. Si algún consumidor usa `date`/`time` para lógica (sort/compare) y no solo display, se evalúa caso por caso (el ISO crudo facilita ordenar).

### 4. Tests

- Unit del pipe: los 3 modos, `null`/`undefined`, string ISO y `Date`, y un caso de valor inválido → `''`.
- Smoke: los componentes tocados compilan y renderizan con el pipe (al menos los specs existentes siguen verdes).

## Fuera de alcance

- Date-pickers / inputs de fecha (no hay en muestras; `date-auto-format.directive` no se toca).
- Cambio global de `LOCALE_ID` de la app.
- Pantallas fuera de `features/analitica/muestras`.
- Migrar otros usos del `DatePipe` en otras features (aunque el pipe extendido queda disponible para reusar a futuro).

## Criterios de aceptación

1. Toda fecha visible en Muestras y subpantallas se renderiza `dd/mm/yyyy` (con año).
2. Donde se muestra hora, queda `dd/mm/yyyy HH:mm` o fecha + `HH:mm` con el mismo formato.
3. No quedan strings de fecha armados a mano en los modelos de muestras; el formato sale solo del pipe.
4. `ng test` verde (pipe + specs existentes de los componentes tocados).
