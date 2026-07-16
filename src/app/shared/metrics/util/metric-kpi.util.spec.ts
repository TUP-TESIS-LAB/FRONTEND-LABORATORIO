import { formatKpiValue, kpiDeltaMeta } from './metric-kpi.util';
import { MetricKpi } from '../models/metric-envelopes.model';

describe('formatKpiValue', () => {
  it('devuelve "—" cuando value es null (sin datos)', () => {
    const kpi: MetricKpi = { key: 'k', label: 'K', value: null, unit: '' };
    expect(formatKpiValue(kpi)).toBe('—');
  });

  it('formatea el número en locale es-AR y agrega la unidad', () => {
    const kpi: MetricKpi = { key: 'k', label: 'K', value: 1234.5, unit: '%' };
    expect(formatKpiValue(kpi)).toBe(`${(1234.5).toLocaleString('es-AR')} %`);
  });

  it('no agrega espacio extra cuando la unidad es vacía', () => {
    const kpi: MetricKpi = { key: 'k', label: 'K', value: 10, unit: '' };
    expect(formatKpiValue(kpi)).toBe((10).toLocaleString('es-AR'));
  });
});

describe('kpiDeltaMeta', () => {
  it('devuelve null cuando no hay delta', () => {
    expect(kpiDeltaMeta(undefined)).toBeNull();
  });

  it('devuelve null cuando changePct es null', () => {
    expect(kpiDeltaMeta({ previousValue: 10, changePct: null })).toBeNull();
  });

  it('devuelve flecha arriba en verde cuando changePct > 0', () => {
    expect(kpiDeltaMeta({ previousValue: 10, changePct: 5 }))
      .toEqual({ icon: 'pi pi-arrow-up', cssVar: 'var(--ds-success)' });
  });

  it('devuelve flecha abajo en rojo cuando changePct < 0', () => {
    expect(kpiDeltaMeta({ previousValue: 10, changePct: -5 }))
      .toEqual({ icon: 'pi pi-arrow-down', cssVar: 'var(--ds-danger)' });
  });

  it('devuelve estado neutro cuando changePct es 0', () => {
    expect(kpiDeltaMeta({ previousValue: 10, changePct: 0 }))
      .toEqual({ icon: 'pi pi-minus', cssVar: 'var(--ds-text-muted)' });
  });
});
