import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { UrgentesEnCursoPage } from './urgentes-en-curso.page';
import { URGENT_IN_PROGRESS_FEATURE_KEY, initialUrgentInProgressState } from '../../store/urgent-in-progress/urgent-in-progress.state';
import { selectUrgentInProgressBoard } from '../../store/urgent-in-progress/urgent-in-progress.selectors';
import { loadUrgentInProgress } from '../../store/urgent-in-progress/urgent-in-progress.actions';
import { AttentionState } from '../../models/atencion.model';
import { UrgentInProgressBoard, UrgentInProgressItem } from '../../models/urgent-in-progress.model';
import { PollingService } from '@core/refresh';

/** Item mínimo para las pruebas del tablero. */
function itemOf(partial: Partial<UrgentInProgressItem>): UrgentInProgressItem {
  return {
    attentionId: 1,
    attentionNumber: 'A-001',
    patientFullName: 'Paciente Test',
    patientDni: '30111222',
    attentionState: AttentionState.REGISTERING_GENERAL_DATA,
    urgentSince: new Date().toISOString(),
    ...partial,
  };
}

/** Stub de PollingService: evita timers reales en tests. */
const pollingStub = {
  startPolling: vi.fn(() => ({ stop: vi.fn(), pokeNow: vi.fn(), setActive: vi.fn() })),
};

function setup(board: UrgentInProgressBoard | null = null) {
  TestBed.configureTestingModule({
    imports: [UrgentesEnCursoPage],
    providers: [
      provideMockStore({
        initialState: {
          [URGENT_IN_PROGRESS_FEATURE_KEY]: { ...initialUrgentInProgressState, board },
        },
      }),
      provideNoopAnimations(),
      { provide: PollingService, useValue: pollingStub },
    ],
  });
  const fixture = TestBed.createComponent(UrgentesEnCursoPage);
  const store = TestBed.inject(MockStore);
  store.overrideSelector(selectUrgentInProgressBoard, board);
  store.refreshState();
  return { fixture, store };
}

describe('UrgentesEnCursoPage', () => {
  beforeEach(() => {
    pollingStub.startPolling.mockClear();
  });

  it('ordena vencidos primero y cuenta los vencidos', () => {
    const slaTargetMinutes = 60;
    const now = Date.now();
    // rojo: 100% del target -> 60 min de antigüedad
    const rojo = itemOf({
      attentionId: 1,
      attentionNumber: 'A-ROJO',
      urgentSince: new Date(now - 61 * 60000).toISOString(),
    });
    // amarillo: ~85% del target -> 51 min de antigüedad
    const amarillo = itemOf({
      attentionId: 2,
      attentionNumber: 'A-AMARILLO',
      urgentSince: new Date(now - 51 * 60000).toISOString(),
    });
    // verde: <80% del target -> 30 min de antigüedad
    const verde = itemOf({
      attentionId: 3,
      attentionNumber: 'A-VERDE',
      urgentSince: new Date(now - 30 * 60000).toISOString(),
    });

    // Insertados en orden verde, rojo, amarillo para probar que el sort reordena.
    const { fixture } = setup({ slaTargetMinutes, items: [verde, rojo, amarillo] });
    fixture.detectChanges();

    const rows = fixture.componentInstance.rows();
    expect(rows[0].attentionNumber).toBe('A-ROJO');
    expect(rows[0].slaStatus).toBe('rojo');
    expect(rows[1].attentionNumber).toBe('A-AMARILLO');
    expect(rows[1].slaStatus).toBe('amarillo');
    expect(rows[2].attentionNumber).toBe('A-VERDE');
    expect(rows[2].slaStatus).toBe('verde');

    expect(fixture.componentInstance.overdueCount()).toBe(1);
  });

  it('mapea attentionState a etapa en español', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;
    expect(component.stageLabel(AttentionState.IN_EXTRACTION)).toBe('En extracción');
    expect(component.stageLabel(AttentionState.REGISTERING_GENERAL_DATA)).toBe('Recepción');
    expect(component.stageLabel(AttentionState.REGISTERING_ANALYSES)).toBe('Análisis');
    expect(component.stageLabel(AttentionState.ON_COLLECTION_PROCESS)).toBe('Cobro');
    expect(component.stageLabel(AttentionState.ON_BILLING_PROCESS)).toBe('Facturación');
    expect(component.stageLabel(AttentionState.AWAITING_CONFIRMATION)).toBe('Confirmación');
    expect(component.stageLabel(AttentionState.AWAITING_EXTRACTION)).toBe('Esperando extracción');
  });

  it('inicia el polling en ngOnInit y lo detiene en ngOnDestroy', () => {
    const { fixture } = setup();
    const stopSpy = vi.fn();
    pollingStub.startPolling.mockReturnValueOnce({ stop: stopSpy, pokeNow: vi.fn(), setActive: vi.fn() });

    fixture.componentInstance.ngOnInit();
    expect(pollingStub.startPolling).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'urgentes-en-curso', intervalMs: 10000 }),
    );

    fixture.componentInstance.ngOnDestroy();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('el poll callback dispatchea loadUrgentInProgress', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.ngOnInit();

    const calls = (pollingStub.startPolling as any).mock.calls;
    const pollCallback = calls[calls.length - 1][0].poll;
    pollCallback();

    expect(dispatchSpy).toHaveBeenCalledWith(loadUrgentInProgress());
  });

  it('sin board (null) no rompe y muestra 0 filas', () => {
    const { fixture } = setup(null);
    fixture.detectChanges();
    expect(fixture.componentInstance.rows()).toEqual([]);
    expect(fixture.componentInstance.overdueCount()).toBe(0);
  });

  it('renderiza las 5 columnas: paciente, numero, etapa, antiguedad, sla', () => {
    const { fixture } = setup();
    const fields = fixture.componentInstance.columns.map(c => c.field);
    expect(fields).toEqual(['paciente', 'numero', 'etapa', 'antiguedad', 'sla']);
  });

  it('urgentSince null/no parseable no rompe: elapsedMinutes null, sla desconocido, no cuenta como vencido', () => {
    const slaTargetMinutes = 60;
    const now = Date.now();
    const sinDatos = itemOf({
      attentionId: 4,
      attentionNumber: 'A-SIN-DATOS',
      urgentSince: null,
    });
    const rojo = itemOf({
      attentionId: 5,
      attentionNumber: 'A-ROJO',
      urgentSince: new Date(now - 61 * 60000).toISOString(),
    });

    const { fixture } = setup({ slaTargetMinutes, items: [sinDatos, rojo] });
    fixture.detectChanges();

    const rows = fixture.componentInstance.rows();
    const sinDatosRow = rows.find(r => r.attentionNumber === 'A-SIN-DATOS');
    expect(sinDatosRow?.elapsedMinutes).toBeNull();
    expect(sinDatosRow?.slaStatus).toBe('desconocido');

    // Solo el rojo cuenta como vencido; el de urgentSince null no.
    expect(fixture.componentInstance.overdueCount()).toBe(1);

    expect(fixture.nativeElement.textContent).not.toContain('NaN');
    expect(fixture.nativeElement.textContent).toContain('—');
  });

  it('no renderiza el enum crudo del estado en el DOM (solo la etiqueta en español)', () => {
    const slaTargetMinutes = 60;
    const item = itemOf({ attentionState: AttentionState.ON_COLLECTION_PROCESS });
    const { fixture } = setup({ slaTargetMinutes, items: [item] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('ON_COLLECTION_PROCESS');
    expect(fixture.nativeElement.textContent).toContain('Cobro');
  });
});
