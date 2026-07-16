import { describe, expect, it } from 'vitest';
import { toIsoDate, defaultFilter, toKpiCard, toBreakdownRows } from './financiero-dashboard.page';
import { MetricKpi, MetricBreakdown } from '@shared/metrics/models/metric-envelopes.model';

// Funciones puras del dashboard financiero — testeadas sin TestBed (bug conocido NG0950
// con input.required() + setInput() en specs compilados en JIT, ver CLAUDE.md/qa-config).

describe('toIsoDate', () => {
  it('formatea en horario local sin corrimiento de timezone', () => {
    expect(toIsoDate(new Date(2026, 5, 7))).toBe('2026-06-07');
    expect(toIsoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('defaultFilter', () => {
  it('cubre los últimos 30 días con granularidad diaria', () => {
    const f = defaultFilter();
    const from = new Date(f.dateFrom);
    const to = new Date(f.dateTo);
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    expect(days).toBe(29);
    expect(f.granularity).toBe('DAY');
    expect(f.branchId).toBeUndefined();
  });
});

describe('toKpiCard', () => {
  it('value === null se muestra como "—" (sin datos, no 0)', () => {
    const kpi: MetricKpi = { key: 'k', label: 'Recaudación', value: null, unit: '$' };
    const card = toKpiCard(kpi);
    expect(card.value).toBe('—');
    expect(card.sub).toBeNull();
    expect(card.icon).toBeNull();
  });

  it('delta positivo: ícono de suba, color success, sub con el pct absoluto', () => {
    const kpi: MetricKpi = { key: 'k', label: 'Recaudación', value: 1000, unit: '$', delta: { previousValue: 800, changePct: 25 } };
    const card = toKpiCard(kpi);
    expect(card.icon).toBe('pi pi-arrow-up');
    expect(card.accentColor).toBe('var(--ds-success)');
    expect(card.sub).toBe('25.0% vs. período anterior');
  });

  it('delta negativo: ícono de baja, color danger, sub con el valor absoluto (sin signo)', () => {
    const kpi: MetricKpi = { key: 'k', label: 'Egresos', value: 500, unit: '$', delta: { previousValue: 800, changePct: -37.5 } };
    const card = toKpiCard(kpi);
    expect(card.icon).toBe('pi pi-arrow-down');
    expect(card.accentColor).toBe('var(--ds-danger)');
    expect(card.sub).toBe('37.5% vs. período anterior');
  });

  it('sin delta (o changePct null): sin ícono, color por defecto, sin sub', () => {
    const kpi: MetricKpi = { key: 'k', label: 'Liquidaciones pendientes', value: 3, unit: 'liquidaciones' };
    const card = toKpiCard(kpi);
    expect(card.icon).toBeNull();
    expect(card.accentColor).toBe('var(--brand-secondary)');
    expect(card.sub).toBeNull();
  });
});

describe('toBreakdownRows', () => {
  it('mapea los slices a filas { label, value } para la tabla', () => {
    const breakdown: MetricBreakdown = {
      dimension: 'sucursal',
      slices: [{ key: '1', label: 'Sede Centro', value: 1000 }, { key: '2', label: 'Sede Norte', value: 500 }],
    };
    expect(toBreakdownRows(breakdown)).toEqual([
      { label: 'Sede Centro', value: 1000 },
      { label: 'Sede Norte', value: 500 },
    ]);
  });

  it('breakdown undefined (todavía no cargó) → []', () => {
    expect(toBreakdownRows(undefined)).toEqual([]);
  });
});
