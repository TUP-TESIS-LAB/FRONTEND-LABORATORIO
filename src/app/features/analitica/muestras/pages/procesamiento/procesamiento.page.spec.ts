import { describe, expect, it, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { PollingService } from '@core/refresh';
import { ProcesamientoPage } from './procesamiento.page';
import {
  selectProcesamientoItems,
  selectMuestrasBranchName,
  selectMuestrasError,
  selectMuestrasBranchId,
} from '../../store/muestras.selectors';
import { selectTemplates, selectTemplatesError } from '../../store/worksheet-templates/worksheet-templates.selectors';
import type { Tube } from '../../models/tube.model';

/**
 * Template mínimo: los sub-componentes (TransitionDialog, RowActionsMenu, modales)
 * usan signal inputs que no se reflejan en ɵcmp.inputs bajo JIT (modo de vitest),
 * lo que dispara NG0303. El smoke test valida la lógica del componente; la
 * integración del template completo se cubre en e2e.
 */
const SMOKE_TEMPLATE = `<section class="proc-page"><h1>Procesamiento</h1></section>`;

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
}

function setup(): ComponentFixture<ProcesamientoPage> {
  installLocalStorageMock();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ProcesamientoPage],
    providers: [
      provideNoopAnimations(),
      provideRouter([]),
      provideMockStore({
        selectors: [
          { selector: selectProcesamientoItems, value: [] },
          { selector: selectMuestrasBranchName, value: 'CENTRAL' },
          { selector: selectMuestrasBranchId, value: 1 },
          { selector: selectMuestrasError, value: null },
          { selector: selectTemplates, value: [] },
          { selector: selectTemplatesError, value: null },
        ],
      }),
      {
        provide: PollingService,
        useValue: { startPolling: vi.fn(() => ({ stop: vi.fn(), pokeNow: vi.fn(), setActive: vi.fn() })) },
      },
    ],
  });
  TestBed.overrideTemplate(ProcesamientoPage, SMOKE_TEMPLATE);
  const fixture = TestBed.createComponent(ProcesamientoPage);
  fixture.detectChanges();
  return fixture;
}

describe('ProcesamientoPage — menú por-fila', () => {
  it('onRowAction abre el diálogo con la transición y el tube de la fila', () => {
    const fx = setup();
    const component = fx.componentInstance;
    const tube = { id: 'p1', labelIds: [20], state: 'processing' } as unknown as Tube;
    component.onRowAction('rejected', tube);
    expect(component.activeTransition()?.key).toBe('rejected');
    expect(component.rowMenuSamples()).toEqual([tube]);
  });

  it('confirmDialog despacha transitionLabels con los labelIds del tube', () => {
    const fx = setup();
    const component = fx.componentInstance;
    const store = TestBed.inject(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    const tube = { id: 'p1', labelIds: [20, 21], state: 'processing' } as unknown as Tube;
    component.onRowAction('rollback', tube);
    component.confirmDialog({ dest: {}, note: '' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ labelIds: [20, 21], transitionKey: 'rollback' }),
    );
  });

  it('cancelDialog limpia la transición activa y las filas del menú', () => {
    const fx = setup();
    const component = fx.componentInstance;
    const tube = { id: 'p1', labelIds: [20], state: 'processing' } as unknown as Tube;
    component.onRowAction('lost', tube);
    component.cancelDialog();
    expect(component.activeTransition()).toBeNull();
    expect(component.rowMenuSamples()).toEqual([]);
  });
});
