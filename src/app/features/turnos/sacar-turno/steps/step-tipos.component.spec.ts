import { TestBed } from '@angular/core/testing';
import { StepTiposComponent } from './step-tipos.component';
import { TipoAnalisis } from '../models/sacar-turno.model';

const TIPOS: TipoAnalisis[] = [
  { id: 1, nombre: 'Hemograma', descripcionCorta: 'Sangre completa', categoria: 'Hematología', ayuno: false, icono: '', preparacion: [], determinationIds: [10] },
  { id: 2, nombre: 'Glucemia', descripcionCorta: 'Azúcar en sangre', categoria: 'Bioquímica', ayuno: true, icono: '', preparacion: [], determinationIds: [20] },
  { id: 3, nombre: 'Orina completa', descripcionCorta: '', categoria: 'Bioquímica', ayuno: false, icono: '', preparacion: [], determinationIds: [30] },
];

describe('StepTiposComponent', () => {
  function setup(selectedIds: number[] = []) {
    TestBed.configureTestingModule({ imports: [StepTiposComponent] });
    const fixture = TestBed.createComponent(StepTiposComponent);
    fixture.componentRef.setInput('tipos', TIPOS);
    fixture.componentRef.setInput('selectedIds', selectedIds);
    fixture.detectChanges();
    return fixture;
  }

  function captureEmitted(fixture: ReturnType<typeof setup>): number[][] {
    const emitted: number[][] = [];
    fixture.componentInstance.selectionChange.subscribe((ids) => emitted.push(ids));
    return emitted;
  }

  it('filtra sugerencias por nombre/categoría y excluye los ya seleccionados', () => {
    const fixture = setup([1]);

    fixture.componentInstance.onSearch({ query: 'bioqu' } as any);

    const ids = (fixture.componentInstance as any).suggestions().map((t: TipoAnalisis) => t.id);
    expect(ids).toEqual([2, 3]);
  });

  it('agrega un análisis al seleccionarlo desde el autocomplete', () => {
    const fixture = setup();
    const emitted = captureEmitted(fixture);

    fixture.componentInstance.onSelect({ value: TIPOS[0] } as any);

    expect(emitted).toEqual([[1]]);
  });

  it('no duplica un análisis que ya está seleccionado', () => {
    const fixture = setup([1]);
    const emitted = captureEmitted(fixture);

    fixture.componentInstance.onSelect({ value: TIPOS[0] } as any);

    expect(emitted).toEqual([]);
  });

  it('quita un análisis de la tabla de seleccionados', () => {
    const fixture = setup([1, 2]);
    const emitted = captureEmitted(fixture);

    fixture.componentInstance.remove(1);

    expect(emitted).toEqual([[2]]);
  });

  it('Enter con exactamente una sugerencia la agrega directo', () => {
    const fixture = setup();
    const emitted = captureEmitted(fixture);
    fixture.componentInstance.onSearch({ query: 'hemograma' } as any);

    fixture.componentInstance.onKeyup({ key: 'Enter' } as any);

    expect(emitted).toEqual([[1]]);
  });

  it('Enter sin sugerencias filtradas no emite cambios', () => {
    const fixture = setup();
    const emitted = captureEmitted(fixture);
    fixture.componentInstance.onSearch({ query: 'no existe' } as any);

    fixture.componentInstance.onKeyup({ key: 'Enter' } as any);

    expect(emitted).toEqual([]);
  });
});
