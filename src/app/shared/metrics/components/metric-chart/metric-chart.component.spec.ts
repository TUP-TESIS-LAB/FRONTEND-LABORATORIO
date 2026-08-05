import { TestBed } from '@angular/core/testing';
import { MetricChartComponent } from './metric-chart.component';

/**
 * Smoke test del componente sin pasar por render de template (`detectChanges()`).
 *
 * Este entorno de vitest tiene un problema conocido con `input.required()` en Angular:
 * NG0950 se dispara aun cuando el binding existe de forma estática en el host template
 * (reproducido con `ui-empty-state`, que usa `input.required<string>()` — no es un bug
 * introducido por este kit). Mismo problema documentado en `cobro-atencion.component.ts`
 * para `setInput()`.
 *
 * Además, `componentRef.setInput()` sobre los inputs opcionales de este componente
 * (`series`/`breakdown`/`unit`) tampoco es confiable acá: `series()` puede seguir leyendo
 * `undefined` después de `setInput('series', ...)` (NG0303 intermitente), lo que hace que
 * cualquier assert sobre `chartOptions()`/`chartData()` con datos seteados sea un falso
 * positivo si el `unit` esperado coincide con el default. Por eso la cobertura real de
 * `unit → eje/tooltip` vive en `chart-data.mapper.spec.ts` (`buildYAxisScale`, función
 * pura) y este test sólo valida la lógica de clase sin forzar inputs ni render.
 */
describe('MetricChartComponent', () => {
  it('sin series ni breakdown, chartData() es null (empty-state)', () => {
    const fixture = TestBed.createComponent(MetricChartComponent);
    fixture.componentInstance.type = 'bar';

    expect(fixture.componentInstance['chartData']()).toBeNull();
  });
});
