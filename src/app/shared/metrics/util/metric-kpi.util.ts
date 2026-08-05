import { MetricDelta, MetricKpi } from '../models/metric-envelopes.model';
import { unitFormat } from './metric-format.util';

/** Metadata visual del delta de un KPI, lista para alimentar un ícono + color en `ui-stat-card`. */
export interface KpiDeltaMeta {
  icon: string;
  cssVar: string;
}

/**
 * Nouns de dominio de `MetricKpi.unit` que en realidad son moneda — el backend los emite
 * como `"ARS"` (`GetRevenueKpisUseCase`, `GetBillingKpisUseCase`, `GetCashSessionKpisUseCase`,
 * `GetDigitalBatchKpisUseCase`, `GetTreasuryKpisUseCase`), NO como el format-kind
 * `"currency"` de `MetricSeries`/`MetricBreakdown` — son vocabularios intencionalmente
 * distintos (`MetricKpi.unit` es texto libre para leer, `unit` de serie/breakdown es un
 * format-kind cerrado para renderizar un eje; ver `metric-format.util.ts`). Este set puentea
 * el noun de moneda al format-kind SÓLO para formatear el número acá — no toca `unitFormat`.
 */
const CURRENCY_KPI_UNITS = new Set(['ARS']);

/**
 * Formatea el `value` de un `MetricKpi` para mostrarlo en `ui-stat-card`.
 * `value === null` significa "sin datos" (no 0) y se muestra como "—".
 *
 * KPIs de moneda (`unit === "ARS"`) formatean con `unitFormat('currency')` — el mismo
 * `Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'})` que ya usan las tablas de
 * detalle (`CurrencyArPipe`) — en vez de `toLocaleString + " " + unit`, que mostraba
 * "126.200 ARS" / "499,5 ARS" / "7.423,529 ARS" en los stat tiles de Financiero mientras la
 * tabla de al lado mostraba "$ 126.200,00" para el MISMO dato (KAN-252).
 */
export function formatKpiValue(kpi: MetricKpi): string {
  if (kpi.value === null) return '—';
  if (CURRENCY_KPI_UNITS.has(kpi.unit)) {
    return unitFormat('currency').format(kpi.value);
  }
  const formatted = kpi.value.toLocaleString('es-AR');
  return kpi.unit ? `${formatted} ${kpi.unit}` : formatted;
}

/**
 * Ícono (PrimeIcon) + variable CSS de color para el delta de un KPI.
 * `changePct` ausente o null = sin dato comparable, no se muestra flecha.
 */
export function kpiDeltaMeta(delta?: MetricDelta): KpiDeltaMeta | null {
  if (!delta || delta.changePct === null) return null;
  if (delta.changePct > 0) return { icon: 'pi pi-arrow-up', cssVar: 'var(--ds-success)' };
  if (delta.changePct < 0) return { icon: 'pi pi-arrow-down', cssVar: 'var(--ds-danger)' };
  return { icon: 'pi pi-minus', cssVar: 'var(--ds-text-muted)' };
}
