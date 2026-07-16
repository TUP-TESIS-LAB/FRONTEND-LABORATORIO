import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MiRutaPage } from './mi-ruta.page';
import { loadMyRoute } from '../../store/home-visit.actions';
import { selectMyRoute, selectMyRoutePending } from '../../store/home-visit.selectors';
import { DOMICILIO_FEATURE_KEY, initialDomicilioState } from '../../store/home-visit.state';
import { HomeVisit } from '../../models/home-visit.model';
import { PollingService } from '@core/refresh';
import { BreakpointService } from '@shared/ui/breakpoint.service';

/**
 * Smoke tests para MiRutaPage.
 *
 * Se usan con vitest (JIT). Los componentes child reales no se renderizan
 * igual que en AOT, por lo que se aplica NO_ERRORS_SCHEMA y se testea solo
 * la lógica del componente (métodos, señales, dispatch).
 */
describe('MiRutaPage (smoke)', () => {
  let store: MockStore;
  const mockRouter = { navigate: vi.fn() };
  const mockPollingHandle = { stop: vi.fn(), pokeNow: vi.fn(), setActive: vi.fn() };
  const mockPollingService = { startPolling: vi.fn().mockReturnValue(mockPollingHandle) };
  const mockBreakpointService = { current: () => 'mobile', isMobile: () => true, isDesktop: () => false };

  function setup(visits: HomeVisit[] = [], pending = false) {
    TestBed.configureTestingModule({
      imports: [MiRutaPage],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: { [DOMICILIO_FEATURE_KEY]: initialDomicilioState },
          selectors: [
            { selector: selectMyRoute,        value: visits },
            { selector: selectMyRoutePending, value: pending },
          ],
        }),
        { provide: Router, useValue: mockRouter },
        { provide: PollingService, useValue: mockPollingService },
        { provide: BreakpointService, useValue: mockBreakpointService },
      ],
    });
    store = TestBed.inject(MockStore);
    return TestBed.createComponent(MiRutaPage);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  // ── Creación ────────────────────────────────────────────────────────────────

  it('el componente se crea sin errores', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  // ── ngOnInit ────────────────────────────────────────────────────────────────

  it('en ngOnInit dispara loadMyRoute con la fecha de hoy', () => {
    const fixture = setup();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.ngOnInit();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Domicilio Ruta] Load My Route' }),
    );
  });

  it('en ngOnInit arranca el polling con la key correcta', () => {
    const fixture = setup();
    fixture.componentInstance.ngOnInit();
    expect(mockPollingService.startPolling).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'domicilio-mi-ruta' }),
    );
  });

  it('el polling usa intervalo de 5000 ms', () => {
    const fixture = setup();
    fixture.componentInstance.ngOnInit();
    expect(mockPollingService.startPolling).toHaveBeenCalledWith(
      expect.objectContaining({ intervalMs: 5000 }),
    );
  });

  // ── Señales del store ───────────────────────────────────────────────────────

  it('la lista de visitas inicial está vacía', () => {
    const fixture = setup();
    expect(fixture.componentInstance.visits()).toEqual([]);
  });

  it('pending inicial es false', () => {
    const fixture = setup([], false);
    expect(fixture.componentInstance.pending()).toBe(false);
  });

  // ── sortedVisits ─────────────────────────────────────────────────────────────

  it('sortedVisits ordena las visitas por timeWindowStart', () => {
    const v1 = makeVisit(1, '10:00:00', '11:00:00');
    const v2 = makeVisit(2, '08:00:00', '09:00:00');
    const v3 = makeVisit(3, '14:00:00', '15:00:00');
    const fixture = setup([v1, v2, v3]);

    const sorted = fixture.componentInstance.sortedVisits();
    expect(sorted.map(v => v.id)).toEqual([2, 1, 3]);
  });

  it('sortedVisits con lista vacía devuelve array vacío', () => {
    const fixture = setup([]);
    expect(fixture.componentInstance.sortedVisits()).toEqual([]);
  });

  // ── Helpers de formato ──────────────────────────────────────────────────────

  it('formatTime recorta HH:mm:ss a HH:mm', () => {
    const fixture = setup();
    expect(fixture.componentInstance.formatTime('08:30:00')).toBe('08:30');
    expect(fixture.componentInstance.formatTime('14:00:00')).toBe('14:00');
  });

  it('formatTime devuelve — para cadena vacía', () => {
    const fixture = setup();
    expect(fixture.componentInstance.formatTime('')).toBe('—');
  });

  // ── statusFor ───────────────────────────────────────────────────────────────

  it('statusFor devuelve label y severity correctos para PROGRAMADA', () => {
    const fixture = setup();
    const s = fixture.componentInstance.statusFor('PROGRAMADA');
    expect(s.label).toBe('Programada');
    expect(s.severity).toBe('info');
  });

  it('statusFor devuelve label y severity correctos para EXTRAIDA', () => {
    const fixture = setup();
    const s = fixture.componentInstance.statusFor('EXTRAIDA');
    expect(s.label).toBe('Extraída');
    expect(s.severity).toBe('success');
  });

  it('statusFor devuelve label y severity correctos para NO_REALIZADA', () => {
    const fixture = setup();
    const s = fixture.componentInstance.statusFor('NO_REALIZADA');
    expect(s.label).toBe('No realizada');
    expect(s.severity).toBe('danger');
  });

  it('statusFor devuelve label y severity correctos para EN_TRANSITO', () => {
    const fixture = setup();
    const s = fixture.componentInstance.statusFor('EN_TRANSITO');
    expect(s.label).toBe('En tránsito');
    expect(s.severity).toBe('warn');
  });

  // ── navToDetail ─────────────────────────────────────────────────────────────

  it('navToDetail navega a /domicilio/mi-ruta/:id', () => {
    const fixture = setup();
    const visit = makeVisit(42, '09:00:00', '10:00:00');
    fixture.componentInstance.navToDetail(visit);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/domicilio/mi-ruta', 42]);
  });

  // ── onDateChange ─────────────────────────────────────────────────────────────

  it('onDateChange dispara loadMyRoute con la nueva fecha', () => {
    const fixture = setup();
    fixture.componentInstance.ngOnInit();
    const spy = vi.spyOn(store, 'dispatch');
    const newDate = new Date(2026, 0, 15); // 2026-01-15
    fixture.componentInstance.onDateChange(newDate);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Domicilio Ruta] Load My Route', date: '2026-01-15' }),
    );
  });

  it('onDateChange con null no dispara ninguna acción', () => {
    const fixture = setup();
    fixture.componentInstance.ngOnInit();
    const spy = vi.spyOn(store, 'dispatch');
    spy.mockClear();
    fixture.componentInstance.onDateChange(null as unknown as Date);
    expect(spy).not.toHaveBeenCalled();
  });

  // ── Render con N tarjetas (lógica) ──────────────────────────────────────────

  it('con 3 visitas en el store, sortedVisits devuelve 3 elementos', () => {
    const visits = [
      makeVisit(1, '08:00:00', '09:00:00'),
      makeVisit(2, '10:00:00', '11:00:00'),
      makeVisit(3, '13:00:00', '14:00:00'),
    ];
    const fixture = setup(visits);
    expect(fixture.componentInstance.sortedVisits()).toHaveLength(3);
  });
});

// ── Factory de visita de prueba ───────────────────────────────────────────────

function makeVisit(id: number, start: string, end: string): HomeVisit {
  return {
    id,
    appointmentId: 100 + id,
    patientId: 200 + id,
    branchId: 1,
    assignedExtractorId: 5,
    attentionId: null,
    addressStreet: 'Av. Siempre Viva',
    addressNumber: `${id * 100}`,
    addressCity: 'Springfield',
    addressReferences: null,
    timeWindowStart: start,
    timeWindowEnd: end,
    status: 'PROGRAMADA',
    scheduledAt: null,
    patientName: `Paciente ${id}`,
    patientDni: `3000000${id}`,
    extractorName: 'Homer Simpson',
  };
}
