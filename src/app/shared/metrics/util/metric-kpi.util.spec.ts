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

  describe('KPI de moneda (unit "ARS") — formatea igual que las tablas (CurrencyArPipe), no "126.200 ARS" (KAN-252)', () => {
    // Mismo formatter que CurrencyArPipe/unitFormat('currency') — Intl.NumberFormat usa un
    // espacio NBSP (U+00A0) entre "$" y el número en locale es-AR, no un espacio común.
    const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

    it('reproduce el caso reportado en QA: 126200 → moneda, no "126.200 ARS"', () => {
      const kpi: MetricKpi = { key: 'recaudacion.total', label: 'Recaudación total', value: 126200, unit: 'ARS' };
      const out = formatKpiValue(kpi);
      expect(out).not.toContain('ARS');
      expect(out).toBe(ars.format(126200));
    });

    it('499.5 → 2 decimales de moneda, no "499,5 ARS"', () => {
      const kpi: MetricKpi = { key: 'ticket.promedio', label: 'Ticket promedio', value: 499.5, unit: 'ARS' };
      expect(formatKpiValue(kpi)).toBe(ars.format(499.5));
    });

    it('7423.529 → redondea a 2 decimales, no "7.423,529 ARS"', () => {
      const kpi: MetricKpi = { key: 'copagos.total', label: 'Copagos totales', value: 7423.529, unit: 'ARS' };
      expect(formatKpiValue(kpi)).toBe(ars.format(7423.529));
      expect(formatKpiValue(kpi)).not.toContain('529');
    });

    it('value 0 en ARS: sigue siendo moneda formateada, no "—" (0 no es null)', () => {
      const kpi: MetricKpi = { key: 'k', label: 'K', value: 0, unit: 'ARS' };
      expect(formatKpiValue(kpi)).toBe(ars.format(0));
    });

    it('null en ARS: sigue siendo "—" (sin datos), la rama de moneda no lo pisa', () => {
      const kpi: MetricKpi = { key: 'k', label: 'K', value: null, unit: 'ARS' };
      expect(formatKpiValue(kpi)).toBe('—');
    });
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
