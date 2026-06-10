import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { Analysis, AttentionResponse, AttentionState } from '../../models/atencion.model';
import { AttentionPricing } from '../../models/pricing.model';
import { AtencionApiService } from '../../services/atencion-api.service';
import { Patient } from '../../../pacientes/models/patient.model';
import { PatientService } from '../../../pacientes/services/patient.service';
import { AnalysisService } from '../../services/analysis.service';
import { LabelsService } from '../../services/labels.service';
import { RotuloPdfService } from '../../services/rotulo-pdf.service';
import { NotificationService } from '@core/services/notification.service';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import * as A from './atencion.actions';
import { AtencionEffects } from './atencion.effects';

function sample(over: Partial<AttentionResponse> = {}): AttentionResponse {
  return {
    id: 1, tenantId: 1, attentionNumber: 'A-001', publicCode: null,
    patientId: 100, doctorId: null, branchId: 1,
    insurancePlanId: null, indications: null,
    paymentId: null, protocolId: null, extractorId: null,
    attentionBox: null, deskAttentionBox: null, prescriptionFileUrl: null,
    isUrgent: false, authorizationNumber: null,
    observations: null, cancellationReason: null, cancelledAtState: null,
    attentionState: AttentionState.REGISTERING_GENERAL_DATA,
    mostAdvancedState: AttentionState.REGISTERING_GENERAL_DATA,
    analysisAuthorizations: [],
    copaymentAmount: null,
    ...over,
  };
}

describe('AtencionEffects', () => {
  let actions$: ReplaySubject<Action>;
  let api: Partial<Record<keyof AtencionApiService, ReturnType<typeof vi.fn>>> & {
    getPricing: ReturnType<typeof vi.fn>;
    setCopayment: ReturnType<typeof vi.fn>;
  };
  let patients: { existsByDni: ReturnType<typeof vi.fn>; getByDni: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; verify: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let analysis: { getById: ReturnType<typeof vi.fn> };
  let labels: { getByProtocol: ReturnType<typeof vi.fn> };
  let rotuloPdf: { generate: ReturnType<typeof vi.fn> };
  let notification: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };
  let effects: AtencionEffects;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);
    api = {
      list: vi.fn(),
      getById: vi.fn(),
      createBlank: vi.fn(),
      createPreFilled: vi.fn(),
      assignGeneralData: vi.fn(),
      addAnalysis: vi.fn(),
      addPayment: vi.fn(),
      endCollection: vi.fn(),
      endBilling: vi.fn(),
      endSecretaryPhase: vi.fn(),
      returnPhase: vi.fn(),
      cancel: vi.fn(),
      addObservations: vi.fn(),
      getPricing: vi.fn(),
      setCopayment: vi.fn(),
    };
    patients = { existsByDni: vi.fn(), getByDni: vi.fn(), create: vi.fn(), update: vi.fn(), getById: vi.fn(), verify: vi.fn() };
    router = { navigate: vi.fn() };
    analysis = { getById: vi.fn() };
    labels = { getByProtocol: vi.fn() };
    rotuloPdf = { generate: vi.fn().mockResolvedValue(undefined) };
    notification = { error: vi.fn(), success: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AtencionEffects,
        provideMockActions(() => actions$ as unknown as Observable<Action>),
        { provide: AtencionApiService, useValue: api },
        { provide: PatientService, useValue: patients },
        { provide: Router, useValue: router },
        { provide: AnalysisService, useValue: analysis },
        { provide: LabelsService, useValue: labels },
        { provide: RotuloPdfService, useValue: rotuloPdf },
        { provide: NotificationService, useValue: notification },
        { provide: OperatorBranchContextService, useValue: { branchId: () => 1001, branchName: () => 'Central' } },
      ],
    });
    effects = TestBed.inject(AtencionEffects);
  });

  it('loadList$ → success maps to loadAtencionesSuccess', async () => {
    const items = [sample()];
    (api.list as ReturnType<typeof vi.fn>).mockReturnValue(of(items));
    actions$.next(A.loadAtenciones());
    const out = await firstValueFrom(effects.loadList$.pipe(take(1)));
    expect(out).toEqual(A.loadAtencionesSuccess({ items }));
  });

  it('loadList$ → http error maps to loadAtencionesFailure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    (api.list as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    actions$.next(A.loadAtenciones());
    const out = await firstValueFrom(effects.loadList$.pipe(take(1)));
    expect(out).toEqual(A.loadAtencionesFailure({ error }));
  });

  it('loadDetail$ → success maps to loadAtencionSuccess', async () => {
    const item = sample({ id: 7 });
    (api.getById as ReturnType<typeof vi.fn>).mockReturnValue(of(item));
    actions$.next(A.loadAtencion({ id: 7 }));
    const out = await firstValueFrom(effects.loadDetail$.pipe(take(1)));
    expect(api.getById).toHaveBeenCalledWith(7);
    expect(out).toEqual(A.loadAtencionSuccess({ item }));
  });

  it('createBlank$ → success navigates to the new atención', async () => {
    const item = sample({ id: 42 });
    (api.createBlank as ReturnType<typeof vi.fn>).mockReturnValue(of(item));
    actions$.next(A.createBlankAtencion({
      payload: { branchId: 1, patientId: 100, attentionNumber: 'A-N1', deskAttentionBox: 1 },
    }));
    const out = await firstValueFrom(effects.createBlank$.pipe(take(1)));
    expect(router.navigate).toHaveBeenCalledWith(['/analitica/atencion', 42]);
    expect(out).toEqual(A.atencionMutationSuccess({ item }));
  });

  it('addPayment$ → success returns atencionMutationSuccess', async () => {
    const item = sample({ id: 1, attentionState: AttentionState.ON_COLLECTION_PROCESS });
    (api.addPayment as ReturnType<typeof vi.fn>).mockReturnValue(of(item));
    actions$.next(A.addPayment({ id: 1, payload: { paymentId: 9001 } }));
    const out = await firstValueFrom(effects.addPayment$.pipe(take(1)));
    expect(out).toEqual(A.atencionMutationSuccess({ item }));
  });

  it('addPayment$ → success returns the post-payment mutation result', async () => {
    const afterPayment = sample({ id: 1, attentionState: AttentionState.ON_COLLECTION_PROCESS });
    (api.addPayment as ReturnType<typeof vi.fn>).mockReturnValue(of(afterPayment));

    // Subscribe FIRST to capture the emission, then dispatch (avoids ReplaySubject(1) buffer loss).
    const emission = firstValueFrom(effects.addPayment$.pipe(take(1)));
    actions$.next(A.addPayment({ id: 1, payload: { paymentId: 9001 } }));

    expect(await emission).toEqual(A.atencionMutationSuccess({ item: afterPayment }));
    expect(api.addPayment).toHaveBeenCalledTimes(1);
  });

  it('addAnalysis$ with concatMap queues a second dispatch instead of cancelling it', async () => {
    const out1 = sample({ id: 1 });
    const out2 = sample({ id: 1, isUrgent: true });
    (api.addAnalysis as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(of(out1))
      .mockReturnValueOnce(of(out2));

    // Subscribe first, then dispatch both — both emissions are captured by toArray.
    const collected = firstValueFrom(effects.addAnalysis$.pipe(take(2), toArray()));
    actions$.next(A.addAnalysisList({
      id: 1, payload: { items: [{ analysisId: 1, isAuthorized: false }], isUrgent: false, authorizationNumber: null },
    }));
    actions$.next(A.addAnalysisList({
      id: 1, payload: { items: [{ analysisId: 1, isAuthorized: false }, { analysisId: 2, isAuthorized: true }], isUrgent: true, authorizationNumber: null },
    }));

    const results = await collected;
    expect(results).toEqual([
      A.atencionMutationSuccess({ item: out1 }),
      A.atencionMutationSuccess({ item: out2 }),
    ]);
    expect(api.addAnalysis).toHaveBeenCalledTimes(2);
  });

  it('mutation http error maps to atencionMutationFailure', async () => {
    const error = new HttpErrorResponse({ status: 409 });
    (api.endBilling as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    actions$.next(A.endBilling({ id: 1 }));
    const out = await firstValueFrom(effects.endBilling$.pipe(take(1)));
    expect(out).toEqual(A.atencionMutationFailure({ error }));
  });

  it('createPatientInline$ → create OK → auto-verifica y emite patientResolved con el verificado', async () => {
    const created  = { id: 9, dni: '5' } as Patient;
    const verified = { id: 9, dni: '5', verifiedAt: '2026-06-10T10:00:00Z' } as Patient;
    (patients.create as ReturnType<typeof vi.fn>).mockReturnValue(of(created));
    (patients.verify as ReturnType<typeof vi.fn>).mockReturnValue(of(verified));
    actions$.next(A.createPatientInline({ payload: {} as any }));
    const out = await firstValueFrom(effects.createPatientInline$.pipe(take(1)));
    expect(patients.verify).toHaveBeenCalledWith(9);
    expect(out).toEqual(A.patientResolved({ patient: verified }));
  });

  it('createPatientInline$ → create OK pero verify 422 → patientResolved con el creado (silencioso)', async () => {
    const created = { id: 9, dni: '5' } as Patient;
    (patients.create as ReturnType<typeof vi.fn>).mockReturnValue(of(created));
    (patients.verify as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    actions$.next(A.createPatientInline({ payload: {} as any }));
    const out = await firstValueFrom(effects.createPatientInline$.pipe(take(1)));
    expect(out).toEqual(A.patientResolved({ patient: created }));
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('createPatientInline$ → error → patientResolutionFailure', async () => {
    const error = new HttpErrorResponse({ status: 400 });
    (patients.create as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    actions$.next(A.createPatientInline({ payload: {} as any }));
    const out = await firstValueFrom(effects.createPatientInline$.pipe(take(1)));
    expect(out).toEqual(A.patientResolutionFailure({ error }));
  });

  it('updatePatientInline$ → update OK → auto-verifica y emite patientResolved con el verificado', async () => {
    const updated  = { id: 9, dni: '5' } as Patient;
    const verified = { id: 9, dni: '5', verifiedAt: '2026-06-10T10:00:00Z' } as Patient;
    (patients.update as ReturnType<typeof vi.fn>).mockReturnValue(of(updated));
    (patients.verify as ReturnType<typeof vi.fn>).mockReturnValue(of(verified));
    actions$.next(A.updatePatientInline({ id: 9, payload: {} as any }));
    const out = await firstValueFrom(effects.updatePatientInline$.pipe(take(1)));
    expect(patients.verify).toHaveBeenCalledWith(9);
    expect(out).toEqual(A.patientResolved({ patient: verified }));
  });

  it('updatePatientInline$ → update OK pero verify 422 → patientResolved con el actualizado (silencioso)', async () => {
    const updated = { id: 9, dni: '5' } as Patient;
    (patients.update as ReturnType<typeof vi.fn>).mockReturnValue(of(updated));
    (patients.verify as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    actions$.next(A.updatePatientInline({ id: 9, payload: {} as any }));
    const out = await firstValueFrom(effects.updatePatientInline$.pipe(take(1)));
    expect(out).toEqual(A.patientResolved({ patient: updated }));
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('startAttentionForPatient$ → createBlank + assign OK → mutationSuccess + navega', async () => {
    const created = { id: 10 } as any;
    const assigned = { id: 10, attentionState: 'REGISTERING_ANALYSES' } as any;
    (api.createBlank as ReturnType<typeof vi.fn>).mockReturnValue(of(created));
    (api.assignGeneralData as ReturnType<typeof vi.fn>).mockReturnValue(of(assigned));
    actions$.next(A.startAttentionForPatient({ patientId: 5, doctorId: null, indications: null, queueEntryId: null }));
    const out = await firstValueFrom(effects.startAttentionForPatient$.pipe(take(1)));
    expect(api.createBlank).toHaveBeenCalled();
    expect(api.assignGeneralData).toHaveBeenCalledWith(10, { patientId: 5, doctorId: null, insurancePlanId: null, indications: null });
    expect(router.navigate).toHaveBeenCalledWith(['/analitica/atencion', 10]);
    expect(out).toEqual(A.atencionMutationSuccess({ item: assigned }));
  });

  it('startAttentionForPatient$ → createBlank con queueEntryId → lo pasa al payload', async () => {
    const created = { id: 10 } as any;
    const assigned = { id: 10, attentionState: 'REGISTERING_ANALYSES' } as any;
    (api.createBlank as ReturnType<typeof vi.fn>).mockReturnValue(of(created));
    (api.assignGeneralData as ReturnType<typeof vi.fn>).mockReturnValue(of(assigned));
    actions$.next(A.startAttentionForPatient({ patientId: 5, doctorId: null, indications: null, queueEntryId: 42 }));
    const out = await firstValueFrom(effects.startAttentionForPatient$.pipe(take(1)));
    expect(api.createBlank).toHaveBeenCalledWith(expect.objectContaining({ queueEntryId: 42 }));
    expect(out).toEqual(A.atencionMutationSuccess({ item: assigned }));
  });

  it('startAttentionForPatient$ → propaga el doctorId al assignGeneralData', async () => {
    const created = { id: 10 } as any;
    const assigned = { id: 10, attentionState: 'REGISTERING_ANALYSES' } as any;
    (api.createBlank as ReturnType<typeof vi.fn>).mockReturnValue(of(created));
    (api.assignGeneralData as ReturnType<typeof vi.fn>).mockReturnValue(of(assigned));
    actions$.next(A.startAttentionForPatient({ patientId: 5, doctorId: 77, indications: 'Ayuno', queueEntryId: null }));
    await firstValueFrom(effects.startAttentionForPatient$.pipe(take(1)));
    expect(api.assignGeneralData).toHaveBeenCalledWith(10, { patientId: 5, doctorId: 77, insurancePlanId: null, indications: 'Ayuno' });
  });

  it('startAttentionForPatient$ → createBlank falla → mutationFailure, sin navegar', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    (api.createBlank as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    actions$.next(A.startAttentionForPatient({ patientId: 5, doctorId: null, indications: null, queueEntryId: null }));
    const out = await firstValueFrom(effects.startAttentionForPatient$.pipe(take(1)));
    expect(out).toEqual(A.atencionMutationFailure({ error }));
  });

  it('resolvePatient$ → existe → patientResolved', async () => {
    const patient = { id: 5, dni: '18901234' } as Patient;
    (patients.existsByDni as ReturnType<typeof vi.fn>).mockReturnValue(of(true));
    (patients.getByDni as ReturnType<typeof vi.fn>).mockReturnValue(of(patient));
    actions$.next(A.resolvePatientByDni({ dni: '18901234' }));
    const out = await firstValueFrom(effects.resolvePatient$.pipe(take(1)));
    expect(out).toEqual(A.patientResolved({ patient }));
  });

  it('resolvePatient$ → no existe → patientNotFound', async () => {
    (patients.existsByDni as ReturnType<typeof vi.fn>).mockReturnValue(of(false));
    actions$.next(A.resolvePatientByDni({ dni: '18901234' }));
    const out = await firstValueFrom(effects.resolvePatient$.pipe(take(1)));
    expect(out).toEqual(A.patientNotFound({ dni: '18901234' }));
  });

  it('loadAttentionPatient$ → getById → patientResolved', async () => {
    const patient = { id: 5, dni: '1' } as Patient;
    (patients.getById as ReturnType<typeof vi.fn>).mockReturnValue(of(patient));
    actions$.next(A.loadAttentionPatient({ patientId: 5 }));
    const out = await firstValueFrom(effects.loadAttentionPatient$.pipe(take(1)));
    expect(patients.getById).toHaveBeenCalledWith(5);
    expect(out).toEqual(A.patientResolved({ patient }));
  });

  it('loadAttentionAnalyses$ → forkJoin getById → attentionAnalysesLoaded', async () => {
    const a1 = { id: 3, shortCode: 'BIO001', name: 'Hemograma' } as Analysis;
    const a2 = { id: 4, shortCode: 'BIO002', name: 'Glucemia' } as Analysis;
    (analysis.getById as ReturnType<typeof vi.fn>).mockImplementation((id: number) => of(id === 3 ? a1 : a2));
    actions$.next(A.loadAttentionAnalyses({ analysisIds: [3, 4] }));
    const out = await firstValueFrom(effects.loadAttentionAnalyses$.pipe(take(1)));
    expect(out).toEqual(A.attentionAnalysesLoaded({ analyses: [a1, a2] }));
  });

  it('loadAttentionAnalyses$ → ids vacío → loaded []', async () => {
    actions$.next(A.loadAttentionAnalyses({ analysisIds: [] }));
    const out = await firstValueFrom(effects.loadAttentionAnalyses$.pipe(take(1)));
    expect(out).toEqual(A.attentionAnalysesLoaded({ analyses: [] }));
  });

  it('downloadProtocolLabels$ con labels → genera el PDF', () => {
    const ls = [{ id: 1, protocolId: 9, analysisId: 3 }];
    (labels.getByProtocol as ReturnType<typeof vi.fn>).mockReturnValue(of(ls));
    effects.downloadProtocolLabels$.subscribe();
    actions$.next(A.downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));
    expect(labels.getByProtocol).toHaveBeenCalledWith(9);
    expect(rotuloPdf.generate).toHaveBeenCalledWith('P-9', ls);
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('downloadProtocolLabels$ sin labels → notifica, no genera', () => {
    (labels.getByProtocol as ReturnType<typeof vi.fn>).mockReturnValue(of([]));
    effects.downloadProtocolLabels$.subscribe();
    actions$.next(A.downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));
    expect(notification.error).toHaveBeenCalled();
    expect(rotuloPdf.generate).not.toHaveBeenCalled();
  });

  // ── Pricing effects ──────────────────────────────────────────────────────

  it('loadPricing$ → success → loadPricingSuccess', async () => {
    const pricing: AttentionPricing = {
      items: [{ analysisId: 3, authorized: true, cantidadUb: 2, valorUbParticular: null, precioPaciente: 0 }],
      subtotal: 0, copayment: 0, total: 0,
    };
    (api.getPricing as ReturnType<typeof vi.fn>).mockReturnValue(of(pricing));
    actions$.next(A.loadPricing({ attentionId: 42 }));
    const out = await firstValueFrom(effects.loadPricing$.pipe(take(1)));
    expect(api.getPricing).toHaveBeenCalledWith(42);
    expect(out).toEqual(A.loadPricingSuccess({ pricing }));
  });

  it('loadPricing$ → HTTP 400 con mensaje → notifica toast + loadPricingFailure', async () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: 'No hay un plan particular configurado para el laboratorio.' },
    });
    (api.getPricing as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    actions$.next(A.loadPricing({ attentionId: 42 }));
    const out = await firstValueFrom(effects.loadPricing$.pipe(take(1)));
    expect(notification.error).toHaveBeenCalledWith(
      'No hay un plan particular configurado para el laboratorio.'
    );
    expect(out).toEqual(A.loadPricingFailure({ error }));
  });

  it('setCopayment$ → success → [setCopaymentSuccess, loadPricing]', async () => {
    const item = sample({ id: 42 });
    (api.setCopayment as ReturnType<typeof vi.fn>).mockReturnValue(of(item));
    actions$.next(A.setCopayment({ attentionId: 42, copaymentAmount: 1500 }));
    const outs = await firstValueFrom(effects.setCopayment$.pipe(take(2), toArray()));
    expect(api.setCopayment).toHaveBeenCalledWith(42, { copaymentAmount: 1500 });
    expect(outs[0]).toEqual(A.setCopaymentSuccess({ item }));
    expect(outs[1]).toEqual(A.loadPricing({ attentionId: 42 }));
  });

  it('setCopayment$ → failure → toast + setCopaymentFailure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    (api.setCopayment as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    actions$.next(A.setCopayment({ attentionId: 42, copaymentAmount: null }));
    const out = await firstValueFrom(effects.setCopayment$.pipe(take(1)));
    expect(notification.error).toHaveBeenCalledWith(
      'No se pudo guardar el copago. Revisá la conexión y volvé a intentarlo.'
    );
    expect(out).toEqual(A.setCopaymentFailure({ error }));
  });

  // ── B3c: removeAnalysisFromResumen$ ──────────────────────────────────────

  it('removeAnalysisFromResumen$ → success → [removeAnalysisFromResumenSuccess, loadAttentionAnalyses, loadPricing]', async () => {
    const item = sample({
      id: 42,
      analysisAuthorizations: [{ id: 2, analysisId: 7, isAuthorized: false, active: true }],
    });
    (api.addAnalysis as ReturnType<typeof vi.fn>).mockReturnValue(of(item));

    actions$.next(A.removeAnalysisFromResumen({
      attentionId: 42,
      analysisId: 3,
      payload: { items: [{ analysisId: 7, isAuthorized: false }], isUrgent: false, authorizationNumber: null },
    }));

    const outs = await firstValueFrom(effects.removeAnalysisFromResumen$.pipe(take(3), toArray()));
    expect(api.addAnalysis).toHaveBeenCalledWith(42, {
      items: [{ analysisId: 7, isAuthorized: false }], isUrgent: false, authorizationNumber: null,
    });
    // First action: success with updated item
    expect(outs[0]).toEqual(A.removeAnalysisFromResumenSuccess({ item }));
    // Second action: reload analyses with the IDs from the response
    expect(outs[1]).toEqual(A.loadAttentionAnalyses({ analysisIds: [7] }));
    // Third action: reload pricing
    expect(outs[2]).toEqual(A.loadPricing({ attentionId: 42 }));
  });

  it('removeAnalysisFromResumen$ → success con lista vacía → loadAttentionAnalyses con []', async () => {
    const item = sample({ id: 42, analysisAuthorizations: [] });
    (api.addAnalysis as ReturnType<typeof vi.fn>).mockReturnValue(of(item));

    actions$.next(A.removeAnalysisFromResumen({
      attentionId: 42,
      analysisId: 3,
      payload: { items: [], isUrgent: false, authorizationNumber: null },
    }));

    const outs = await firstValueFrom(effects.removeAnalysisFromResumen$.pipe(take(3), toArray()));
    expect(outs[1]).toEqual(A.loadAttentionAnalyses({ analysisIds: [] }));
    expect(outs[2]).toEqual(A.loadPricing({ attentionId: 42 }));
  });

  it('removeAnalysisFromResumen$ → HTTP error → toast + removeAnalysisFromResumenFailure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    (api.addAnalysis as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));

    actions$.next(A.removeAnalysisFromResumen({
      attentionId: 42,
      analysisId: 3,
      payload: { items: [], isUrgent: false, authorizationNumber: null },
    }));

    const out = await firstValueFrom(effects.removeAnalysisFromResumen$.pipe(take(1)));
    expect(notification.error).toHaveBeenCalledWith(
      'No se pudo quitar el análisis. Revisá la conexión y volvé a intentarlo.'
    );
    expect(out).toEqual(A.removeAnalysisFromResumenFailure({ error }));
  });

  // ── verifyPatient$ ────────────────────────────────────────────────────────

  it('verifyPatient$ → verify OK → verifyPatientSuccess', async () => {
    const patient = { id: 9, dni: '12345678', status: 'VERIFIED', source: 'PORTAL', verifiedAt: '2026-06-07T10:00:00Z' } as Patient;
    (patients.verify as ReturnType<typeof vi.fn>).mockReturnValue(of(patient));
    actions$.next(A.verifyPatient({ id: 9 }));
    const out = await firstValueFrom(effects.verifyPatient$.pipe(take(1)));
    expect(patients.verify).toHaveBeenCalledWith(9);
    expect(out).toEqual(A.verifyPatientSuccess({ patient }));
  });

  it('verifyPatient$ → 422 → toast mapeado + verifyPatientFailure', async () => {
    const error = new HttpErrorResponse({ status: 422 });
    (patients.verify as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    actions$.next(A.verifyPatient({ id: 9 }));
    const out = await firstValueFrom(effects.verifyPatient$.pipe(take(1)));
    expect(notification.error).toHaveBeenCalledWith(
      'No se pudo verificar el paciente: faltan datos obligatorios o una cobertura activa.'
    );
    expect(out).toEqual(A.verifyPatientFailure({ error }));
  });

  it('verifyPatient$ → error genérico → toast genérico + verifyPatientFailure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    (patients.verify as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
    actions$.next(A.verifyPatient({ id: 9 }));
    const out = await firstValueFrom(effects.verifyPatient$.pipe(take(1)));
    expect(notification.error).toHaveBeenCalledWith(
      'No se pudo verificar el paciente. Revisá la conexión y volvé a intentarlo.'
    );
    expect(out).toEqual(A.verifyPatientFailure({ error }));
  });
});
