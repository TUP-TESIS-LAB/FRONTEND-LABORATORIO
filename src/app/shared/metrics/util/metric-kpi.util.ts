import { MetricDelta, MetricKpi } from '../models/metric-envelopes.model';

/** Metadata visual del delta de un KPI, lista para alimentar un ícono + color en `ui-stat-card`. */
export interface KpiDeltaMeta {
  icon: string;
  cssVar: string;
}

/**
 * Formatea el `value` de un `MetricKpi` para mostrarlo en `ui-stat-card`.
 * `value === null` significa "sin datos" (no 0) y se muestra como "—".
 */
export function formatKpiValue(kpi: MetricKpi): string {
  if (kpi.value === null) return '—';
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
