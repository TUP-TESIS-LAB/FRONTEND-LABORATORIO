import { TestBed } from '@angular/core/testing';
import { MetricChartComponent } from './metric-chart.component';

/**
 * Smoke test del componente sin pasar por render de template (`detectChanges()`).
 *
 * Este entorno de vitest tiene un problema conocido con `input.required()` en Angular:
 * NG0950 se dispara aun cuando el binding existe de forma estática en el host template
 * (reproducido con `ui-empty-state`, que usa `input.required<string>()` — no es un bug
 * introducido por este kit). Mismo problema documentado en `cobro-atencion.component.ts`
 * para `setInput()`. Por eso la cobertura real de este componente vive en
 * `chart-data.mapper.spec.ts` (funciones puras) y este test solo valida la lógica de
 * clase sin forzar el render del árbol de hijos.
 */
describe('MetricChartComponent', () => {
  it('sin series ni breakdown, chartData() es null (empty-state)', () => {
    const fixture = TestBed.createComponent(MetricChartComponent);
    fixture.componentInstance.type = 'bar';

    expect(fixture.componentInstance['chartData']()).toBeNull();
  });
});
