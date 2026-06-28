import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { AgendaPage } from './agenda.page';
import { loadHomeVisits } from '../../store/home-visit.actions';
import {
  selectHomeVisits,
  selectHomeVisitsPending,
} from '../../store/home-visit.selectors';
import { DOMICILIO_FEATURE_KEY, initialDomicilioState } from '../../store/home-visit.state';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

/**
 * Smoke tests para AgendaPage.
 *
 * Se usan con vitest (JIT). Los componentes child reales (PageHeaderComponent,
 * DataTableComponent) no se renderizan en JIT de la misma forma que en AOT,
 * por lo que se usan NO_ERRORS_SCHEMA y se evita detectChanges() en los tests
 * de template — se testean solo la lógica del componente (métodos, señales).
 *
 * Para tests de render completo, usar ng test (AOT) con include domicilio.
 */
describe('AgendaPage (smoke)', () => {
  let store: MockStore;
  const mockRouter = { navigate: vi.fn() };

  function setup(branchId: number | null = 1) {
    TestBed.configureTestingModule({
      imports: [AgendaPage],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: {
            [DOMICILIO_FEATURE_KEY]: initialDomicilioState,
          },
          selectors: [
            { selector: selectHomeVisits,       value: [] },
            { selector: selectHomeVisitsPending, value: false },
          ],
        }),
        { provide: Router, useValue: mockRouter },
        {
          provide: OperatorBranchContextService,
          useValue: { branchId: () => branchId, branchName: () => 'Sucursal Demo' },
        },
      ],
    });
    store = TestBed.inject(MockStore);
    return TestBed.createComponent(AgendaPage);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  // ── Lógica del componente (sin template rendering) ──────────────────────────

  it('el componente se crea sin errores', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('en ngOnInit dispara loadHomeVisits con la sucursal del contexto', () => {
    const fixture = setup(3);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.ngOnInit();
    expect(spy).toHaveBeenCalledWith(loadHomeVisits({ branchId: 3 }));
  });

  it('en ngOnInit usa branchId=1 como fallback cuando el contexto devuelve null', () => {
    const fixture = setup(null);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.ngOnInit();
    expect(spy).toHaveBeenCalledWith(loadHomeVisits({ branchId: 1 }));
  });

  it('formatTime recorta HH:mm:ss a HH:mm', () => {
    const fixture = setup();
    expect(fixture.componentInstance.formatTime('08:30:00')).toBe('08:30');
    expect(fixture.componentInstance.formatTime('14:00:00')).toBe('14:00');
    expect(fixture.componentInstance.formatTime('00:05:00')).toBe('00:05');
  });

  it('formatTime devuelve — para cadena vacía', () => {
    const fixture = setup();
    expect(fixture.componentInstance.formatTime('')).toBe('—');
  });

  it('statusDisplay devuelve label y severity correctos para PROGRAMADA', () => {
    const fixture = setup();
    const d = fixture.componentInstance.statusDisplay('PROGRAMADA');
    expect(d.label).toBe('Programada');
    expect(d.severity).toBe('info');
  });

  it('statusDisplay devuelve label y severity correctos para EXTRAIDA', () => {
    const fixture = setup();
    const d = fixture.componentInstance.statusDisplay('EXTRAIDA');
    expect(d.label).toBe('Extraída');
    expect(d.severity).toBe('success');
  });

  it('statusDisplay devuelve label y severity correctos para EN_TRANSITO', () => {
    const fixture = setup();
    const d = fixture.componentInstance.statusDisplay('EN_TRANSITO');
    expect(d.label).toBe('En tránsito');
    expect(d.severity).toBe('warn');
  });

  it('statusDisplay devuelve label y severity correctos para NO_REALIZADA', () => {
    const fixture = setup();
    const d = fixture.componentInstance.statusDisplay('NO_REALIZADA');
    expect(d.label).toBe('No realizada');
    expect(d.severity).toBe('danger');
  });

  it('las columnas definidas incluyen paciente, dirección, ventana, extractor y estado', () => {
    const fixture = setup();
    const fields = fixture.componentInstance.columns.map((c) => c.field);
    expect(fields).toContain('paciente');
    expect(fields).toContain('direccion');
    expect(fields).toContain('ventana');
    expect(fields).toContain('extractor');
    expect(fields).toContain('estado');
  });

  it('las visitas iniciales están vacías', () => {
    const fixture = setup();
    expect(fixture.componentInstance.visits()).toEqual([]);
  });

  it('pending inicial es false', () => {
    const fixture = setup();
    expect(fixture.componentInstance.pending()).toBe(false);
  });
});
