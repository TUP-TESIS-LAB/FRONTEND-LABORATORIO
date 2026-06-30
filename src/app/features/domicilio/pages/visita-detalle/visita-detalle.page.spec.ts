import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { VisitaDetallePage } from './visita-detalle.page';
import {
  loadVisitDetail,
  markExtracted,
  markExtractedSuccess,
  markOutcome,
  markOutcomeSuccess,
  rescheduleVisit,
  rescheduleVisitSuccess,
} from '../../store/home-visit.actions';
import {
  selectVisitDetail,
  selectDetailPending,
  selectActionPending,
} from '../../store/home-visit.selectors';
import { DOMICILIO_FEATURE_KEY, initialDomicilioState } from '../../store/home-visit.state';
import { HomeVisit } from '../../models/home-visit.model';

/**
 * Smoke tests para VisitaDetallePage — Fase 3 (Task 6).
 *
 * Se usan con vitest (JIT). NO_ERRORS_SCHEMA evita errores de child components.
 * Se testea la lógica del componente: dispatch, señales, helpers y acciones.
 */
describe('VisitaDetallePage (smoke)', () => {
  let store: MockStore;
  let actions$: Subject<unknown>;
  const mockRouter = { navigate: vi.fn() };

  function makeActivatedRoute(id: string) {
    return {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'id' ? id : null),
        },
      },
    };
  }

  function setup(visit: HomeVisit | null = null, pending = false, actionPending = false, id = '42') {
    actions$ = new Subject();
    TestBed.configureTestingModule({
      imports: [VisitaDetallePage],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: { [DOMICILIO_FEATURE_KEY]: initialDomicilioState },
          selectors: [
            { selector: selectVisitDetail,   value: visit },
            { selector: selectDetailPending,  value: pending },
            { selector: selectActionPending,  value: actionPending },
          ],
        }),
        provideMockActions(() => actions$),
        { provide: Router,         useValue: mockRouter },
        { provide: ActivatedRoute, useValue: makeActivatedRoute(id) },
      ],
    });
    store = TestBed.inject(MockStore);
    return TestBed.createComponent(VisitaDetallePage);
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

  // ── ngOnInit y dispatch ──────────────────────────────────────────────────────

  it('en ngOnInit dispara loadVisitDetail con el id de la ruta', () => {
    const fixture = setup(null, false, false, '7');
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.ngOnInit();
    expect(spy).toHaveBeenCalledWith(loadVisitDetail({ id: 7 }));
  });

  it('parsea el id como número (no string)', () => {
    const fixture = setup(null, false, false, '99');
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.ngOnInit();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 99 }),
    );
  });

  // ── Señales del store ───────────────────────────────────────────────────────

  it('visit() es null cuando el store no tiene detalle', () => {
    const fixture = setup(null);
    expect(fixture.componentInstance.visit()).toBeNull();
  });

  it('visit() devuelve el objeto cuando el store lo tiene', () => {
    const v = makeVisit(42);
    const fixture = setup(v);
    expect(fixture.componentInstance.visit()).toEqual(v);
  });

  it('pending() refleja el estado del store', () => {
    const fixture = setup(null, true);
    expect(fixture.componentInstance.pending()).toBe(true);
  });

  it('actionPending() refleja el estado del store', () => {
    const fixture = setup(null, false, true);
    expect(fixture.componentInstance.actionPending()).toBe(true);
  });

  // ── Render con visitDetail en el store ──────────────────────────────────────

  it('el componente se crea con un visitDetail en el store sin errores', () => {
    const v = makeVisit(42);
    const fixture = setup(v);
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.visit()).toEqual(v);
  });

  // ── Acciones: visita PROGRAMADA ─────────────────────────────────────────────

  it('con visita PROGRAMADA los diálogos de acción inician cerrados', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    expect(comp.dialogExtraccionVisible()).toBe(false);
    expect(comp.dialogOutcomeVisible()).toBe(false);
    expect(comp.dialogReprogramarVisible()).toBe(false);
  });

  it('abrirConfirmExtraccion() abre el diálogo de extracción', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    fixture.componentInstance.abrirConfirmExtraccion(42);
    expect(fixture.componentInstance.dialogExtraccionVisible()).toBe(true);
  });

  it('abrirDialogOutcome() abre el diálogo de outcome y limpia el motivo', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    comp.selectedReason.set('PACIENTE_AUSENTE');
    comp.abrirDialogOutcome(42);
    expect(comp.dialogOutcomeVisible()).toBe(true);
    expect(comp.selectedReason()).toBeNull();
  });

  it('abrirConfirmReprogramar() abre el diálogo de reprogramación', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    fixture.componentInstance.abrirConfirmReprogramar(42);
    expect(fixture.componentInstance.dialogReprogramarVisible()).toBe(true);
  });

  // ── confirmarExtraccion: dispatch + navegación ───────────────────────────────

  it('confirmarExtraccion() despacha markExtracted con el id y el barcode escaneado', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    const spy = vi.spyOn(store, 'dispatch');
    comp.abrirConfirmExtraccion(42);
    comp.scannedBarcode.set('BARCODE-XYZ');
    comp.confirmarExtraccion();
    expect(spy).toHaveBeenCalledWith(markExtracted({ id: 42, scannedBarcode: 'BARCODE-XYZ' }));
  });

  it('confirmarExtraccion() cierra el diálogo de extracción', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    comp.abrirConfirmExtraccion(42);
    comp.confirmarExtraccion();
    expect(comp.dialogExtraccionVisible()).toBe(false);
  });

  it('al recibir markExtractedSuccess navega a /domicilio/mi-ruta', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    comp.abrirConfirmExtraccion(42);
    comp.confirmarExtraccion();
    actions$.next(markExtractedSuccess({ visit: { ...v, status: 'EXTRAIDA' } }));
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/domicilio/mi-ruta']);
  });

  // ── confirmarOutcome: dispatch + navegación ──────────────────────────────────

  it('confirmarOutcome() despacha markOutcome con id y reason', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    const spy = vi.spyOn(store, 'dispatch');
    comp.abrirDialogOutcome(42);
    comp.selectedReason.set('PACIENTE_AUSENTE');
    comp.confirmarOutcome();
    expect(spy).toHaveBeenCalledWith(
      markOutcome({ id: 42, reason: 'PACIENTE_AUSENTE' }),
    );
  });

  it('confirmarOutcome() cierra el diálogo de outcome', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    comp.abrirDialogOutcome(42);
    comp.selectedReason.set('RECHAZO_PACIENTE');
    comp.confirmarOutcome();
    expect(comp.dialogOutcomeVisible()).toBe(false);
  });

  it('al recibir markOutcomeSuccess navega a /domicilio/mi-ruta', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    comp.abrirDialogOutcome(42);
    comp.selectedReason.set('NO_SE_PUDO_EXTRAER');
    comp.confirmarOutcome();
    actions$.next(markOutcomeSuccess({ visit: { ...v, status: 'NO_REALIZADA' } }));
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/domicilio/mi-ruta']);
  });

  it('confirmarOutcome() NO despacha si no hay motivo seleccionado', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    const spy = vi.spyOn(store, 'dispatch');
    comp.abrirDialogOutcome(42);
    // No setear reason → null por defecto
    comp.confirmarOutcome();
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: markOutcome.type }));
  });

  // ── confirmarReprogramar: dispatch + navegación ──────────────────────────────

  it('confirmarReprogramar() despacha rescheduleVisit con el id', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    const spy = vi.spyOn(store, 'dispatch');
    comp.abrirConfirmReprogramar(42);
    comp.confirmarReprogramar();
    expect(spy).toHaveBeenCalledWith(rescheduleVisit({ id: 42 }));
  });

  it('confirmarReprogramar() cierra el diálogo de reprogramación', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    comp.abrirConfirmReprogramar(42);
    comp.confirmarReprogramar();
    expect(comp.dialogReprogramarVisible()).toBe(false);
  });

  it('al recibir rescheduleVisitSuccess navega a /domicilio/mi-ruta', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    comp.abrirConfirmReprogramar(42);
    comp.confirmarReprogramar();
    actions$.next(rescheduleVisitSuccess({ visit: { ...v, status: 'REPROGRAMADA' } }));
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/domicilio/mi-ruta']);
  });

  // ── Visita NO programada: no ofrece acciones ─────────────────────────────────

  it('con visita EXTRAIDA los métodos de acción NO despachan', () => {
    const v = makeVisit(42, 'EXTRAIDA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    const spy = vi.spyOn(store, 'dispatch');
    // Los botones no están en el DOM para estado != PROGRAMADA,
    // pero verificamos que si se llaman directamente sin id tampoco despachan.
    comp.confirmarExtraccion(); // visitIdEnAccion es null
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: markExtracted.type }));
  });

  // ── statusFor ───────────────────────────────────────────────────────────────

  it('statusFor devuelve label y severity para PROGRAMADA', () => {
    const fixture = setup();
    const s = fixture.componentInstance.statusFor('PROGRAMADA');
    expect(s.label).toBe('Programada');
    expect(s.severity).toBe('info');
  });

  it('statusFor devuelve label y severity para EXTRAIDA', () => {
    const fixture = setup();
    const s = fixture.componentInstance.statusFor('EXTRAIDA');
    expect(s.label).toBe('Extraída');
    expect(s.severity).toBe('success');
  });

  it('statusFor devuelve label y severity para NO_REALIZADA', () => {
    const fixture = setup();
    const s = fixture.componentInstance.statusFor('NO_REALIZADA');
    expect(s.label).toBe('No realizada');
    expect(s.severity).toBe('danger');
  });

  it('statusFor devuelve label y severity para REPROGRAMADA', () => {
    const fixture = setup();
    const s = fixture.componentInstance.statusFor('REPROGRAMADA');
    expect(s.label).toBe('Reprogramada');
    expect(s.severity).toBe('secondary');
  });

  // ── formatTime ──────────────────────────────────────────────────────────────

  it('formatTime recorta HH:mm:ss a HH:mm', () => {
    const fixture = setup();
    expect(fixture.componentInstance.formatTime('09:30:00')).toBe('09:30');
    expect(fixture.componentInstance.formatTime('14:00:00')).toBe('14:00');
  });

  it('formatTime devuelve — para cadena vacía', () => {
    const fixture = setup();
    expect(fixture.componentInstance.formatTime('')).toBe('—');
  });

  // ── formatScheduledAt ───────────────────────────────────────────────────────

  it('formatScheduledAt formatea ISO a DD/MM/YYYY HH:mm', () => {
    const fixture = setup();
    const result = fixture.componentInstance.formatScheduledAt('2026-07-15T10:30:00');
    expect(result).toBe('15/07/2026 10:30');
  });

  it('formatScheduledAt devuelve — para null', () => {
    const fixture = setup();
    expect(fixture.componentInstance.formatScheduledAt(null)).toBe('—');
  });

  // ── volver ──────────────────────────────────────────────────────────────────

  it('volver() navega a /domicilio/mi-ruta', () => {
    const fixture = setup();
    fixture.componentInstance.volver();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/domicilio/mi-ruta']);
  });

  // ── cerrarDialogOutcome ─────────────────────────────────────────────────────

  it('cerrarDialogOutcome() cierra el diálogo y limpia el motivo', () => {
    const v = makeVisit(42, 'PROGRAMADA');
    const fixture = setup(v);
    const comp = fixture.componentInstance;
    comp.abrirDialogOutcome(42);
    comp.selectedReason.set('PACIENTE_AUSENTE');
    comp.cerrarDialogOutcome();
    expect(comp.dialogOutcomeVisible()).toBe(false);
    expect(comp.selectedReason()).toBeNull();
  });
});

// ── Factory ───────────────────────────────────────────────────────────────────

function makeVisit(id: number, status: HomeVisit['status'] = 'PROGRAMADA'): HomeVisit {
  return {
    id,
    appointmentId: 100 + id,
    patientId: 200 + id,
    branchId: 1,
    assignedExtractorId: 5,
    addressStreet: 'Av. Siempre Viva',
    addressNumber: `${id * 100}`,
    addressCity: 'Springfield',
    addressReferences: 'Portón verde',
    timeWindowStart: '08:00:00',
    timeWindowEnd: '10:00:00',
    status,
    scheduledAt: '2026-07-15T09:00:00',
    patientName: `Paciente ${id}`,
    patientDni: `3000000${id}`,
    extractorName: 'Homer Simpson',
  };
}
