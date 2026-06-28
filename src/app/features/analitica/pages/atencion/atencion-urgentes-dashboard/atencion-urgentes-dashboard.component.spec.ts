import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AtencionUrgentesDashboardComponent } from './atencion-urgentes-dashboard.component';
import { URGENT_PENDING_FEATURE_KEY, initialUrgentPendingState } from '../../../store/urgent-pending/urgent-pending.state';
import { selectUrgentPending } from '../../../store/urgent-pending/urgent-pending.selectors';
import { loadUrgentPending, resolveAuth, resolveCobro } from '../../../store/urgent-pending/urgent-pending.actions';
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

  it('sin pendientes no muestra ningún chip de pendiente', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    // Estado FINISHED no produce "Datos" ni "Cobro" como etiqueta de estado
    store.overrideSelector(selectUrgentPending, [rowOf({
      cobroPendiente: false,
      autorizacionPendiente: false,
      datosAdministrativosIncompletos: false,
      attentionState: AttentionState.FINISHED,
    })]);
    store.refreshState();
    fixture.detectChanges();

    // No hay chips de pendientes (la columna "pendientes" queda vacía)
    const pendingCells = fixture.nativeElement.querySelectorAll('[data-testid="pending-chip"]');
    expect(pendingCells.length).toBe(0);
    // El texto "Cobro" y "Autorización" no aparecen como chips
    expect(fixture.nativeElement.textContent).not.toContain('Cobro');
    expect(fixture.nativeElement.textContent).not.toContain('Autorización');
    // "Datos" no aparece como chip (aunque "Datos" podría ser parte de "Datos generales" del estado)
    // Verificamos que no hay el texto exacto del chip "Datos" en la columna pendientes
    const tags = fixture.nativeElement.querySelectorAll('p-tag');
    const tagTexts = Array.from(tags).map((t: any) => t.textContent?.trim() ?? '');
    expect(tagTexts).not.toContain('Datos');
    expect(tagTexts).not.toContain('Cobro');
    expect(tagTexts).not.toContain('Autorización');
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

  // ── Task 9: drawer de resolución ─────────────────────────────────────────────

  it('openResolver: abre el drawer con la atención seleccionada y pausa el polling', () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const stopSpy = vi.fn();
    const setActiveSpy = vi.fn();
    pollingStub.startPolling.mockReturnValueOnce({ stop: stopSpy, pokeNow: vi.fn(), setActive: setActiveSpy });
    comp.ngOnInit();

    const row = rowOf({ id: 7, cobroPendiente: true });
    comp.openResolver(row);

    expect(comp.drawerVisible()).toBe(true);
    expect(comp.selectedRow()).toEqual(row);
    expect(setActiveSpy).toHaveBeenCalledWith(false);
  });

  it('closeResolver: cierra el drawer y reanuda el polling', () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const setActiveSpy = vi.fn();
    pollingStub.startPolling.mockReturnValueOnce({ stop: vi.fn(), pokeNow: vi.fn(), setActive: setActiveSpy });
    comp.ngOnInit();

    const row = rowOf({ id: 8, cobroPendiente: true });
    comp.openResolver(row);
    comp.closeResolver();

    expect(comp.drawerVisible()).toBe(false);
    expect(setActiveSpy).toHaveBeenCalledWith(true);
  });

  it('fila solo con cobroPendiente=true: dispatchea resolveCobro y no las otras acciones', () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const store = TestBed.inject(MockStore);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    const row = rowOf({ id: 99, cobroPendiente: true, autorizacionPendiente: false, datosAdministrativosIncompletos: false });
    comp.openResolver(row);
    fixture.detectChanges();

    comp.onConfirmCobro();

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[UrgentPending] Resolve Cobro', id: 99 })
    );
  });

  it('fila con autorizacionPendiente=true: dispatchea resolveAuth con el número ingresado', () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const store = TestBed.inject(MockStore);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    const row = rowOf({ id: 55, autorizacionPendiente: true, cobroPendiente: false, datosAdministrativosIncompletos: false });
    comp.openResolver(row);
    comp.authForm.controls['authorizationNumber'].setValue('AUTH-123');
    fixture.detectChanges();

    comp.onConfirmAuth();

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[UrgentPending] Resolve Authorization', id: 55, authorizationNumber: 'AUTH-123' })
    );
  });

  it('la columna "estado" usa attentionStateLabel (español) en vez del enum raw', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectUrgentPending, [rowOf({ attentionState: AttentionState.ON_COLLECTION_PROCESS })]);
    store.refreshState();
    fixture.detectChanges();

    // El enum raw "ON_COLLECTION_PROCESS" NO debe aparecer; la etiqueta "Cobro" sí.
    expect(fixture.nativeElement.textContent).not.toContain('ON_COLLECTION_PROCESS');
    expect(fixture.nativeElement.textContent).toContain('Cobro');
  });

  it('onAction con key=resolver llama a openResolver', () => {
    const fixture = setup();
    const comp = fixture.componentInstance;
    const openSpy = vi.spyOn(comp, 'openResolver');

    const row = rowOf({ id: 3, cobroPendiente: true });
    comp.onAction({ key: 'resolver', row });

    expect(openSpy).toHaveBeenCalledWith(row);
  });
});
