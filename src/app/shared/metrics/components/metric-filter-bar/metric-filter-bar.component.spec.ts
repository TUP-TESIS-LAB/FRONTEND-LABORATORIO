import { TestBed } from '@angular/core/testing';
import { MetricFilterBarComponent } from './metric-filter-bar.component';
import { MetricFilter } from '../../models/metric-filter.model';

/**
 * NOTE: se prueba llamando los métodos `protected` del componente directamente (no vía
 * `setInput()`/binding de template) para no depender del binding de `input()` de Angular,
 * que en este entorno de vitest no propaga valores de forma confiable (ver NOTE en
 * `metric-chart.component.spec.ts`). Como `filterChange` es un `output()` normal, sí
 * funciona sin problemas.
 */
describe('MetricFilterBarComponent', () => {
  function create() {
    const fixture = TestBed.createComponent(MetricFilterBarComponent);
    const cmp = fixture.componentInstance as unknown as {
      setFrom(d: Date): void;
      setTo(d: Date): void;
      setBranch(id: number | null): void;
      setGranularity(g: MetricFilter['granularity']): void;
      filterChange: { subscribe(fn: (f: MetricFilter) => void): void };
    };
    const emissions: MetricFilter[] = [];
    cmp.filterChange.subscribe(f => emissions.push(f));
    return { cmp, emissions };
  }

  it('emite un MetricFilter válido (dateFrom <= dateTo) al cambiar el rango de fechas', () => {
    const { cmp, emissions } = create();
    cmp.setFrom(new Date(2026, 0, 1));
    cmp.setTo(new Date(2026, 0, 31));

    expect(emissions.length).toBeGreaterThan(0);
    const last = emissions[emissions.length - 1];
    expect(last.dateFrom).toBe('2026-01-01');
    expect(last.dateTo).toBe('2026-01-31');
    expect(last.dateFrom <= last.dateTo).toBe(true);
  });

  it('sin sucursal seleccionada, branchId es undefined (todas)', () => {
    const { cmp, emissions } = create();
    cmp.setGranularity('WEEK');

    expect(emissions[emissions.length - 1].branchId).toBeUndefined();
  });

  it('al elegir una sucursal, la emite en branchId; al volver a "Todas", vuelve a undefined', () => {
    const { cmp, emissions } = create();
    cmp.setBranch(5);
    expect(emissions[emissions.length - 1].branchId).toBe(5);

    cmp.setBranch(null);
    expect(emissions[emissions.length - 1].branchId).toBeUndefined();
  });

  it('cambia la granularidad y la emite', () => {
    const { cmp, emissions } = create();
    cmp.setGranularity('DAY');
    expect(emissions[emissions.length - 1].granularity).toBe('DAY');
  });

  it('no emite un filtro nuevo cuando el rango queda invertido (dateFrom > dateTo)', () => {
    const { cmp, emissions } = create();
    cmp.setFrom(new Date(2026, 0, 1));
    cmp.setTo(new Date(2026, 0, 10));
    const countBefore = emissions.length;

    cmp.setFrom(new Date(2026, 0, 20));
    expect(emissions.length).toBe(countBefore);
  });
});
