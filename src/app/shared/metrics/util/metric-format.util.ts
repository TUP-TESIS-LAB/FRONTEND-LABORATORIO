/**
 * Clasificador `unit → formato` para gráficos de métricas. `unit` es un format-kind que
 * el backend emite en `MetricSeries.unit`/`MetricBreakdown.unit` — NO es el noun de dominio
 * libre que ya usa `MetricKpi.unit` (ver `metric-kpi.util.ts`). Vocabulario cerrado de 7
 * valores; sólo `count` fuerza eje entero (`precision: 0`, `beginAtZero`).
 *
 * Único archivo del frontend que sabe traducir `unit` a comportamiento de eje/tooltip —
 * `metric-chart.component.ts` lo consume, no reimplementa formato.
 */
export type MetricUnit = 'count' | 'currency' | 'percent' | 'hours' | 'minutes' | 'seconds' | 'decimal';

export interface UnitFormat {
  /** `true` fuerza eje Y entero (`precision: 0` + `beginAtZero`). Sólo `count`. */
  integer: boolean;
  /** Formatea un valor numérico para tick/tooltip/etiqueta, en es-AR. */
  format(value: number): string;
}

const INTEGER_FORMATTER = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const CURRENCY_FORMATTER = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const DECIMAL_1_FORMATTER = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const COUNT_FORMAT: UnitFormat = { integer: true, format: v => INTEGER_FORMATTER.format(v) };

const UNIT_FORMATS: Record<MetricUnit, UnitFormat> = {
  count: COUNT_FORMAT,
  currency: { integer: false, format: v => CURRENCY_FORMATTER.format(v) },
  percent: { integer: false, format: v => `${DECIMAL_1_FORMATTER.format(v)} %` },
  hours: { integer: false, format: v => `${DECIMAL_1_FORMATTER.format(v)} h` },
  minutes: { integer: false, format: v => `${DECIMAL_1_FORMATTER.format(v)} min` },
  seconds: { integer: false, format: v => `${DECIMAL_1_FORMATTER.format(v)} s` },
  decimal: { integer: false, format: v => DECIMAL_1_FORMATTER.format(v) },
};

/** `unit` desconocido o `undefined` cae a `count` — el eje se comporta como conteo. */
export function unitFormat(unit: string | undefined): UnitFormat {
  return UNIT_FORMATS[unit as MetricUnit] ?? COUNT_FORMAT;
}
