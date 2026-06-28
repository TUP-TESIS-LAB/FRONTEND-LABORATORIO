import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AtencionUrgentesDashboardComponent } from './atencion-urgentes-dashboard.component';
import { URGENT_PENDING_FEATURE_KEY, initialUrgentPendingState } from '../../../store/urgent-pending/urgent-pending.state';
import { selectUrgentPending } from '../../../store/urgent-pending/urgent-pending.selectors';
import { loadUrgentPending } from '../../../store/urgent-pending/urgent-pending.actions';
import { AttentionResponse, AttentionState } from '../../../models/atencion.model';
import { PollingService } from '@core/refresh';

/** Fila mínima para las pruebas de chips. */
function rowOf(partial: Partial<AttentionResponse>): AttentionResponse {
  return {
    id: 1,
    attentionState: AttentionState.REGISTERING_GENERAL_DATA,
    protocolId: null,
    doctorId: null,
    cobroPendiente: false,
    autorizacionPendiente: false,
    datosAdministrativosIncompletos: false,
    ...partial,
  } as AttentionResponse;
}

/** Stub de PollingService: evita timers reales en tests. */
const pollingStub = {
  startPolling: vi.fn(() => ({ stop: vi.fn(), pokeNow: vi.fn(), setActive: vi.fn() })),
};

function setup() {
  TestBed.configureTestingModule({
    imports: [AtencionUrgentesDashboardComponent],
    providers: [
      provideMockStore({ initialState: { [URGENT_PENDING_FEATURE_KEY]: initialUrgentPendingState } }),
      provideNoopAnimations(),
      { provide: PollingService, useValue: pollingStub },
    ],
  });
  return TestBed.createComponent(AtencionUrgentesDashboardComponent);
}

describe('AtencionUrgentesDashboardComponent', () => {
  beforeEach(() => {
    pollingStub.startPolling.mockClear();
  });

  it('inicia polling que dispara loadUrgentPending (via startWith(0))', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.ngOnInit();

    // Verificamos que startPolling fue llamado con la config correcta
    expect(pollingStub.startPolling).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'atencion-urgentes-dashboard', intervalMs: 5000 })
    );

    // Extraemos el callback del call y lo invocamos para simular startWith(0)
    const calls = (pollingStub.startPolling as any).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const pollCallback = calls[0][0].poll;
    pollCallback();
    expect(dispatchSpy).toHaveBeenCalledWith(loadUrgentPending());
  });

  it('inicia el polling en ngOnInit y lo detiene en ngOnDestroy', () => {
    const fixture = setup();
    const stopSpy = vi.fn();
    pollingStub.startPolling.mockReturnValueOnce({ stop: stopSpy, pokeNow: vi.fn(), setActive: vi.fn() });

    fixture.componentInstance.ngOnInit();
    expect(pollingStub.startPolling).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'atencion-urgentes-dashboard', intervalMs: 5000 }),
    );

    fixture.componentInstance.ngOnDestroy();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('con cobroPendiente=true renderiza el chip "Cobro"', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectUrgentPending, [rowOf({ cobroPendiente: true })]);
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cobro');
  });

  it('con autorizacionPendiente=true renderiza el chip "Autorización"', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectUrgentPending, [rowOf({ autorizacionPendiente: true })]);
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Autorización');
  });

  it('con datosAdministrativosIncompletos=true renderiza el chip "Datos"', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectUrgentPending, [rowOf({ datosAdministrativosIncompletos: true })]);
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Datos');
  });

  it('sin pendientes no muestra ningún chip', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectUrgentPending, [rowOf({ cobroPendiente: false, autorizacionPendiente: false, datosAdministrativosIncompletos: false })]);
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Cobro');
    expect(fixture.nativeElement.textContent).not.toContain('Autorización');
    expect(fixture.nativeElement.textContent).not.toContain('Datos');
  });

  it('emite resolver al hacer click en acción "Resolver"', () => {
    const fixture = setup();
    const emitted: AttentionResponse[] = [];
    fixture.componentInstance.resolver.subscribe((row: AttentionResponse) => emitted.push(row));

    const row = rowOf({ id: 42, cobroPendiente: true });
    fixture.componentInstance.onAction({ key: 'resolver', row });
    expect(emitted).toHaveLength(1);
    expect(emitted[0].id).toBe(42);
  });

  it('muestra estado vacío cuando no hay atenciones urgentes', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    // Forzamos explícitamente el selector a [] para que no herede overrides de otros tests.
    store.overrideSelector(selectUrgentPending, []);
    store.refreshState();
    fixture.detectChanges();
    // El texto del emptyHeading debe estar presente cuando no hay filas.
    expect(fixture.nativeElement.textContent).toContain('Sin atenciones urgentes pendientes');
  });

  it('tiene las 4 columnas definidas: paciente, fecha, estado, pendientes', () => {
    const c = setup().componentInstance;
    const fields = c.columns.map(col => col.field);
    expect(fields).toContain('paciente');
    expect(fields).toContain('fecha');
    expect(fields).toContain('estado');
    expect(fields).toContain('pendientes');
  });
});
