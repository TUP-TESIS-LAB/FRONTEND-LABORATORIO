import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { ReplaySubject, of } from 'rxjs';
import { DoctorService } from '@features/medicos/services/doctor.service';
import { ResumenStepComponent } from './resumen-step.component';
import { ATENCION_FEATURE_KEY, initialAtencionState } from '../../../../../store/atencion/atencion.state';
import {
  loadAtencion,
  loadAttentionAnalyses,
  loadAttentionPatient,
  loadPricing,
  endSecretaryPhase,
  atencionMutationSuccess,
  atencionMutationFailure,
  setCopayment,
  removeAnalysisFromResumen,
  downloadProtocolLabels,
} from '../../../../../store/atencion/atencion.actions';
import { AttentionState } from '../../../../../models/atencion.model';
import { AttentionPricing } from '../../../../../models/pricing.model';
import { readAtencionSession, writeAtencionSession } from '../../../../../utils/atencion-session-store';

// ─── helpers ────────────────────────────────────────────────────────────────

function attn(): any {
  return {
    id: 42, patientId: 5, isUrgent: false, indications: null,
    copaymentAmount: null,
    analysisAuthorizations: [{ id: 1, analysisId: 3, isAuthorized: true, active: true }],
  };
}

function fullAttn(): any {
  return {
    id: 42, tenantId: 1, attentionNumber: 'A-042', patientId: 100,
    doctorId: null, branchId: 1, insurancePlanId: null, indications: 'Ayuno',
    paymentId: null, protocolId: null, extractorId: null, attentionBox: null,
    deskAttentionBox: null, prescriptionFileUrl: null, isUrgent: true,
    authorizationNumber: null, observations: null, cancellationReason: null,
    cancelledAtState: null, attentionState: AttentionState.AWAITING_CONFIRMATION,
    mostAdvancedState: AttentionState.AWAITING_CONFIRMATION, analysisAuthorizations: [],
    copaymentAmount: null,
  };
}

const SAMPLE_PRICING: AttentionPricing = {
  items: [{ analysisId: 3, authorized: true, cantidadUb: 2, valorUbParticular: null, precioPaciente: 0 }],
  subtotal: 0,
  copayment: 0,
  total: 0,
};

const SEEDED_STATE = {
  [ATENCION_FEATURE_KEY]: {
    ...initialAtencionState,
    resolvedPatient: { id: 5, dni: '18901234', firstName: 'Tute', lastName: 'Gaymer' } as any,
    summaryAnalyses: [{ id: 3, shortCode: 'BIO001', name: 'Hemograma', familyName: null, ubCount: null }],
    pricing: SAMPLE_PRICING,
    pricingLoading: false,
    pricingError: null,
    copaymentMutating: false,
  },
};

// ─── suite ──────────────────────────────────────────────────────────────────

const DOCTOR = { id: 7, firstName: 'Gregory', lastName: 'House', tuition: 'MN-12345', registrationType: 'NACIONAL', active: true };
const doctorServiceStub = {
  getById: vi.fn().mockReturnValue(of(DOCTOR)),
  list: vi.fn().mockReturnValue(of([])),
};

describe('ResumenStepComponent', () => {
  let store: MockStore;
  let actions$: ReplaySubject<Action>;

  beforeEach(async () => {
    sessionStorage.clear();
    doctorServiceStub.getById.mockClear();
    actions$ = new ReplaySubject<Action>(1);

    await TestBed.configureTestingModule({
      imports: [ResumenStepComponent],
      providers: [
        provideMockStore({ initialState: SEEDED_STATE }),
        provideMockActions(() => actions$),
        { provide: DoctorService, useValue: doctorServiceStub },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
  });

  // ── nuevos tests: carga de datos ─────────────────────────────────────────

  it('despacha loadAttentionAnalyses en init y NO loadAttentionPatient si ya está resuelto', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadAttentionAnalyses({ analysisIds: [3] }));
    expect(spy).not.toHaveBeenCalledWith(loadAttentionPatient({ patientId: 5 }));
  });

  it('al iniciar refresca el detail de la atención (loadAtencion)', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadAtencion({ id: 42 }));
  });

  // ── NEW-A: médico solicitante en el resumen ──────────────────────────────
  it('NEW-A: resuelve el médico por doctorId y muestra "Apellido, Nombre — Mat."', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', { ...attn(), doctorId: 7 });
    f.detectChanges();
    expect(doctorServiceStub.getById).toHaveBeenCalledWith(7);
    const text = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Médico solicitante');
    expect(text).toContain('House, Gregory — Mat. MN-12345');
  });

  it('NEW-A: sin doctorId muestra "Sin médico solicitante" y NO llama getById', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', { ...attn(), doctorId: null });
    f.detectChanges();
    expect(doctorServiceStub.getById).not.toHaveBeenCalled();
    expect(f.componentInstance.doctorLabel()).toBe('Sin médico solicitante');
  });

  it('NEW-A: si getById falla, el resumen no rompe y muestra "—"', () => {
    doctorServiceStub.getById.mockReturnValueOnce(
      new ReplaySubject<never>(1), // nunca emite → doctor queda null
    );
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', { ...attn(), doctorId: 7 });
    expect(() => f.detectChanges()).not.toThrow();
    expect(f.componentInstance.doctorLabel()).toBe('—');
  });

  // ── NEW-E: solo-lectura oculta acciones mutadoras ────────────────────────
  it('NEW-E: en readOnly no se renderiza "Finalizar atención" ni "Volver fase"', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn());
    f.componentRef.setInput('readOnly', true);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const labels = Array.from(el.querySelectorAll('button')).map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('Finalizar atención'))).toBe(false);
    expect(labels.some((l) => l.includes('Volver fase'))).toBe(false);
  });

  it('muestra apellido, nombre, dni y el nombre del análisis', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    const text = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Gaymer, Tute');
    expect(text).toContain('18901234');
    expect(text).toContain('Hemograma');
  });

  // ── tests restaurados: flujo finalizar (contrato pessimistic-UI) ─────────

  it('onFinalize dispatches endSecretaryPhase', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn());
    f.detectChanges();
    const dispatched: any[] = [];
    (f.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));
    f.componentInstance.onFinalize();
    expect(dispatched[0].type).toBe(endSecretaryPhase.type);
  });

  it('opens finalize modal when openFinalize is called', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn());
    f.detectChanges();
    expect(f.componentInstance.finalizeModalOpen()).toBe(false);
    f.componentInstance.openFinalize();
    expect(f.componentInstance.finalizeModalOpen()).toBe(true);
  });

  it('emits finished + clears session ONLY after atencionMutationSuccess', () => {
    writeAtencionSession({ atencionId: 42, uiStep: 'confirmar' });
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn());
    f.detectChanges();
    let finished = false;
    f.componentInstance.finished.subscribe(() => (finished = true));
    f.componentInstance.onFinalize();
    // Before success: wizard stays open
    expect(finished).toBe(false);
    expect(readAtencionSession()).not.toBeNull();
    // Success arrives → finish
    actions$.next(atencionMutationSuccess({ item: {} as any }));
    expect(finished).toBe(true);
    expect(readAtencionSession()).toBeNull();
  });

  it('auto-descarga los rótulos tras finalizar OK (downloadProtocolLabels con el protocolId del success)', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn());
    f.detectChanges();
    const dispatched: any[] = [];
    (f.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));
    f.componentInstance.onFinalize();
    // El success trae el protocolId recién asignado al cerrar la fase.
    actions$.next(atencionMutationSuccess({ item: { protocolId: 77 } as any }));
    expect(dispatched).toContainEqual(downloadProtocolLabels({ protocolId: 77, protocolNumber: 'P-77' }));
  });

  it('si el success no trae protocolId no dispara la descarga de rótulos', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn()); // fullAttn().protocolId === null
    f.detectChanges();
    const dispatched: any[] = [];
    (f.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));
    f.componentInstance.onFinalize();
    actions$.next(atencionMutationSuccess({ item: {} as any }));
    expect(dispatched.some((a: any) => a.type === downloadProtocolLabels.type)).toBe(false);
  });

  it('does NOT emit finished / clear session when mutation fails', () => {
    writeAtencionSession({ atencionId: 42, uiStep: 'confirmar' });
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn());
    f.detectChanges();
    let finished = false;
    f.componentInstance.finished.subscribe(() => (finished = true));
    f.componentInstance.onFinalize();
    actions$.next(atencionMutationFailure({ error: {} as any }));
    expect(finished).toBe(false);
    expect(readAtencionSession()).not.toBeNull(); // session survives — user can retry
  });

  // ── tests de pricing ─────────────────────────────────────────────────────

  it('despacha loadPricing en init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadPricing({ attentionId: 42 }));
  });

  it('muestra el total del pricing cuando está disponible', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', { ...attn(), id: 42 });
    f.detectChanges();
    const text = (f.nativeElement as HTMLElement).textContent ?? '';
    // SAMPLE_PRICING tiene total: 0 → CurrencyArPipe (es-AR ARS) lo formatea como '$ 0,00'
    // El separador entre $ y los dígitos es U+00A0 (espacio no separable); normalizamos
    // antes de comparar para que el test no sea frágil ante diferencias de CLDR.
    const normalized = text.replace(/ /g, ' ');
    expect(normalized).toContain('Total');
    expect(normalized).toContain('$ 0,00');
  });

  it('liveTotal recalcula el total EN VIVO al cambiar el copago, sin dispatch (005)', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    // SAMPLE_PRICING.subtotal = 0 y copaymentValue arranca null → total 0
    expect(f.componentInstance.liveTotal()).toBe(0);
    // Tipear el coseguro recalcula el total localmente (subtotal + copago)
    f.componentInstance.copaymentValue.set(1500);
    expect(f.componentInstance.liveTotal()).toBe(1500);
  });

  it('muestra el NOMBRE COMPLETO + el código NBU del análisis (006)', () => {
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: { id: 5, dni: '1', firstName: 'A', lastName: 'B' } as any,
        summaryAnalyses: [
          { id: 3, shortCode: 'BIO001', name: 'Hemograma completo', familyName: null, ubCount: null, nbuCode: '660101' },
        ] as any,
        pricing: SAMPLE_PRICING,
      },
    });
    store.refreshState();
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    const text = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hemograma completo');
    expect(text).toContain('NBU 660101');
    // Ya no mostramos el short-code/ID como etiqueta principal
    expect(text).not.toContain('BIO001');
  });

  it('onCopaymentBlur despacha setCopayment cuando el valor cambia', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', { ...attn(), copaymentAmount: null });
    f.detectChanges();
    const dispatched: any[] = [];
    (f.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));
    f.componentInstance.copaymentValue.set(1500);
    f.componentInstance.onCopaymentBlur();
    expect(dispatched.length).toBeGreaterThan(0);
    expect(dispatched[0].type).toBe(setCopayment.type);
    expect(dispatched[0].attentionId).toBe(42);
    expect(dispatched[0].copaymentAmount).toBe(1500);
  });

  it('onCopaymentBlur NO despacha si el valor no cambió', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', { ...attn(), copaymentAmount: 500 });
    f.detectChanges();
    const dispatched: any[] = [];
    (f.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));
    // Same value as copaymentAmount
    f.componentInstance.copaymentValue.set(500);
    f.componentInstance.onCopaymentBlur();
    expect(dispatched.filter((a: any) => a.type === setCopayment.type)).toHaveLength(0);
  });

  // ── tests B3c: remover análisis desde el resumen ─────────────────────────

  it('onRemoveAnalysis despacha removeAnalysisFromResumen excluyendo el id removido y preservando isAuthorized', () => {
    const atencionConDosAnalisis: any = {
      id: 42, patientId: 5, isUrgent: false, authorizationNumber: null,
      copaymentAmount: null, indications: null,
      analysisAuthorizations: [
        { id: 1, analysisId: 3, isAuthorized: true, active: true },
        { id: 2, analysisId: 7, isAuthorized: false, active: true },
      ],
    };
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', atencionConDosAnalisis);
    f.detectChanges();

    const dispatched: any[] = [];
    (f.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));

    // Quitar el análisis 3 → la lista reducida debe tener SOLO el análisis 7
    f.componentInstance.onRemoveAnalysis(3);

    const removals = dispatched.filter((a: any) => a.type === removeAnalysisFromResumen.type);
    expect(removals).toHaveLength(1);
    const action = removals[0];
    expect(action.attentionId).toBe(42);
    expect(action.analysisId).toBe(3);
    // items debe excluir el análisis 3 y preservar el isAuthorized del 7
    expect(action.payload.items).toEqual([{ analysisId: 7, isAuthorized: false }]);
    expect(action.payload.isUrgent).toBe(false);
    expect(action.payload.authorizationNumber).toBeNull();
  });

  it('onRemoveAnalysis con el último análisis despacha items vacío (no crashea)', () => {
    const atencionConUnAnalisis: any = {
      id: 42, patientId: 5, isUrgent: true, authorizationNumber: 'AUTH-1',
      copaymentAmount: null, indications: null,
      analysisAuthorizations: [
        { id: 1, analysisId: 3, isAuthorized: true, active: true },
      ],
    };
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', atencionConUnAnalisis);
    f.detectChanges();

    const dispatched: any[] = [];
    (f.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));

    f.componentInstance.onRemoveAnalysis(3);

    const removals = dispatched.filter((a: any) => a.type === removeAnalysisFromResumen.type);
    expect(removals).toHaveLength(1);
    const action = removals[0];
    expect(action.payload.items).toEqual([]);
    expect(action.payload.isUrgent).toBe(true);
    expect(action.payload.authorizationNumber).toBe('AUTH-1');
  });
});
