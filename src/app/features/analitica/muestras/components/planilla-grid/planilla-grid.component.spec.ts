import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PlanillaGridComponent } from './planilla-grid.component';
import type { PlanillaSavePayload } from './planilla-grid.component';
import type { PlanillaCell, PlanillaGrid } from '../../models/resultado.model';

const cell = (value: string): PlanillaCell => ({ resultId: 700, determinationId: 800, value });

// NOTA: en este entorno `setInput` sobre un input required falla por una limitación de
// infra JIT (NG0303/NG0950) — la misma que afecta a result-grid.component.spec. Por eso
// estos tests verifican la lógica stateless del componente sin pasar por el binding del
// input `grid`: el reset de ediciones locales en ngOnDestroy y la precedencia de
// `value()` no dependen del grid.
function make(): PlanillaGridComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [PlanillaGridComponent] });
  // El constructor crea un effect() → necesita contexto de inyección.
  return TestBed.runInInjectionContext(() => new PlanillaGridComponent());
}

describe('PlanillaGridComponent (stateless)', () => {
  it('value() devuelve el valor del back cuando no hay edición local', () => {
    const cmp = make();
    expect(cmp.value(50014, 90100, cell('210'))).toBe('210');
  });

  it('setValue() pisa el valor del back con la edición local', () => {
    const cmp = make();
    cmp.setValue(50014, 90100, '999');
    expect(cmp.value(50014, 90100, cell('210'))).toBe('999');
  });

  it('ngOnDestroy() limpia las ediciones locales (no sobreviven al salir/reentrar)', () => {
    const cmp = make();
    cmp.setValue(50014, 90100, '999');
    cmp.ngOnDestroy();
    // Tras destruir, vuelve a mostrar lo del back, nunca lo tipeado antes.
    expect(cmp.value(50014, 90100, cell('210'))).toBe('210');
  });
});

// Fix #7: filtrado de celdas vacías en onSave(). El input required `grid` no se puede setear
// vía binding en este entorno (NG0303/NG0950), así que reemplazamos la signal `grid` en la
// instancia por un grid fijo para ejercitar el armado del payload.
describe('PlanillaGridComponent.onSave() — celdas vacías no entran al payload', () => {
  const PROTOCOL = 11;
  const CATALOG = 22;

  function makeWithGrid(): PlanillaGridComponent {
    const cmp = make();
    const grid: PlanillaGrid = {
      templateId: 1,
      templateName: 'T',
      columns: [{ protocolId: PROTOCOL, patientName: 'Paciente', label: 'Paciente' }],
      sections: [{
        analysisCatalogId: 5,
        analysisName: 'Hemograma',
        rows: [{
          catalogId: CATALOG,
          name: 'Hto',
          unit: '%',
          cells: { [PROTOCOL]: { resultId: 700, determinationId: 800, value: '' } },
        }],
      }],
    };
    // Reemplazo la signal `grid` por un getter fijo; el resto del flujo (columns(), onSave) la usa.
    (cmp as unknown as { grid: () => PlanillaGrid }).grid = () => grid;
    return cmp;
  }

  function capture(cmp: PlanillaGridComponent): PlanillaSavePayload[] {
    const emit = vi.spyOn(cmp.save, 'emit');
    cmp.onSave();
    return emit.mock.calls.length ? (emit.mock.calls[0][0] as PlanillaSavePayload[]) : [];
  }

  it('una celda editada a "" NO entra al payload de save', () => {
    const cmp = makeWithGrid();
    cmp.setValue(PROTOCOL, CATALOG, '');
    expect(capture(cmp)).toEqual([]);
  });

  it('una celda editada a espacios en blanco NO entra al payload', () => {
    const cmp = makeWithGrid();
    cmp.setValue(PROTOCOL, CATALOG, '   ');
    expect(capture(cmp)).toEqual([]);
  });

  it('una celda con valor real SÍ entra al payload', () => {
    const cmp = makeWithGrid();
    cmp.setValue(PROTOCOL, CATALOG, '42');
    expect(capture(cmp)).toEqual([
      { resultId: 700, items: [{ determinationId: 800, resultValue: '42' }] },
    ]);
  });
});
