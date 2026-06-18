import { HttpErrorResponse } from '@angular/common/http';
import { AttentionResponse, AttentionState } from '../../models/atencion.model';
import { Patient } from '../../../pacientes/models/patient.model';
import * as A from './atencion.actions';
import { atencionReducer } from './atencion.reducer';
import { initialAtencionState } from './atencion.state';

function samplePatient(over: Partial<Patient> = {}): Patient {
  return {
    id: 1,
    dni: '12345678',
    firstName: 'Juan',
    lastName: 'Perez',
    birthDate: '1990-01-01',
    gender: 'MALE',
    sexAtBirth: 'MALE',
    status: 'COMPLETE',
    source: 'STAFF',
    verifiedAt: null,
    contacts: [],
    addresses: [],
    coverages: [],
    active: true,
    ...over,
  };
}

function sample(over: Partial<AttentionResponse> = {}): AttentionResponse {
  return {
    id: 1,
    tenantId: 1,
    attentionNumber: 'A-001',
    publicCode: null,
    patientId: 100,
    doctorId: null,
    branchId: 1,
    insurancePlanId: null,
    indications: null,
    paymentId: null,
    protocolId: null,
    extractorId: null,
    attentionBox: null,
    deskAttentionBox: null,
    prescriptionFileUrl: null,
    isUrgent: false,
    authorizationNumber: null,
    observations: null,
    cancellationReason: null,
    cancelledAtState: null,
    attentionState: AttentionState.REGISTERING_GENERAL_DATA,
    mostAdvancedState: AttentionState.REGISTERING_GENERAL_DATA,
    analysisAuthorizations: [],
    copaymentAmount: null,
    ...over,
  };
}

describe('atencionReducer', () => {
  it('loadAtenciones sets listLoading + clears listError', () => {
    const start = { ...initialAtencionState, listError: new HttpErrorResponse({ status: 500 }) };
    const next = atencionReducer(start, A.loadAtenciones());
    expect(next.listLoading).toBe(true);
    expect(next.listError).toBeNull();
  });

  it('loadAtencionesSuccess populates list and clears listLoading', () => {
    const items = [sample(), sample({ id: 2, attentionNumber: 'A-002' })];
    const next = atencionReducer(
      { ...initialAtencionState, listLoading: true },
      A.loadAtencionesSuccess({ items })
    );
    expect(next.list).toEqual(items);
    expect(next.listLoading).toBe(false);
  });

  it('setCopaymentSuccess preserva analysisAuthorizations cuando la respuesta del copago viene vacía', () => {
    const auths = [{ id: 1, analysisId: 3, isAuthorized: true, active: true }] as any;
    const detail = sample({ id: 42, analysisAuthorizations: auths });
    // El endpoint de copago devuelve la atención sin autorizaciones.
    const copaymentResponse = sample({ id: 42, copaymentAmount: 500, analysisAuthorizations: [] });
    const next = atencionReducer(
      { ...initialAtencionState, detail },
      A.setCopaymentSuccess({ item: copaymentResponse }),
    );
    expect(next.detail?.copaymentAmount).toBe(500);
    expect(next.detail?.analysisAuthorizations).toEqual(auths); // no se vacía
    expect(next.copaymentMutating).toBe(false);
  });

  it('setCopaymentSuccess usa las autorizaciones de la respuesta si el backend las incluye', () => {
    const detail = sample({ id: 42, analysisAuthorizations: [{ id: 1, analysisId: 3, isAuthorized: true, active: true }] as any });
    const newAuths = [{ id: 9, analysisId: 7, isAuthorized: false, active: true }] as any;
    const copaymentResponse = sample({ id: 42, copaymentAmount: 500, analysisAuthorizations: newAuths });
    const next = atencionReducer(
      { ...initialAtencionState, detail },
      A.setCopaymentSuccess({ item: copaymentResponse }),
    );
    expect(next.detail?.analysisAuthorizations).toEqual(newAuths);
  });

  it('setAuthorizationNumberSuccess setea el valor y preserva analysisAuthorizations cuando la respuesta viene vacía', () => {
    const auths = [{ id: 1, analysisId: 3, isAuthorized: true, active: true }] as any;
    const detail = sample({ id: 42, analysisAuthorizations: auths });
    // El endpoint dedicado devuelve la atención sin autorizaciones.
    const response = sample({ id: 42, authorizationNumber: 'AUTH-1', analysisAuthorizations: [] });
    const next = atencionReducer(
      { ...initialAtencionState, detail, authorizationMutating: true },
      A.setAuthorizationNumberSuccess({ item: response }),
    );
    expect(next.detail?.authorizationNumber).toBe('AUTH-1');
    expect(next.detail?.analysisAuthorizations).toEqual(auths); // no se vacía
    expect(next.authorizationMutating).toBe(false);
  });

  it('loadAtencionesFailure stores the error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const next = atencionReducer(
      { ...initialAtencionState, listLoading: true },
      A.loadAtencionesFailure({ error })
    );
    expect(next.listError).toBe(error);
    expect(next.listLoading).toBe(false);
  });

  it('setAtencionFilters merges partials (does not wipe other fields)', () => {
    const start = {
      ...initialAtencionState,
      filters: { search: 'foo', states: [AttentionState.FINISHED] },
    };
    const next = atencionReducer(start, A.setAtencionFilters({ filters: { search: 'bar' } }));
    expect(next.filters.search).toBe('bar');
    expect(next.filters.states).toEqual([AttentionState.FINISHED]);
  });

  it('mutation actions flip mutating=true and clear detailError', () => {
    const start = {
      ...initialAtencionState,
      detailError: new HttpErrorResponse({ status: 409 }),
    };
    const next = atencionReducer(start, A.endCollection({ id: 1 }));
    expect(next.mutating).toBe(true);
    expect(next.detailError).toBeNull();
  });

  it('atencionMutationSuccess updates detail and replaces the item in the list', () => {
    const original = sample({ id: 1, attentionState: AttentionState.REGISTERING_GENERAL_DATA });
    const updated  = sample({ id: 1, attentionState: AttentionState.REGISTERING_ANALYSES });
    const start = {
      ...initialAtencionState,
      mutating: true,
      detail: original,
      list: [original, sample({ id: 2, attentionNumber: 'A-002' })],
    };
    const next = atencionReducer(start, A.atencionMutationSuccess({ item: updated }));
    expect(next.mutating).toBe(false);
    expect(next.detail).toBe(updated);
    expect(next.list[0]).toBe(updated); // replaced in-place
    expect(next.list).toHaveLength(2);  // no duplication
  });

  it('atencionMutationSuccess prepends a new item if not in the list (just-created)', () => {
    const created = sample({ id: 99, attentionNumber: 'A-099' });
    const start = {
      ...initialAtencionState,
      mutating: true,
      list: [sample({ id: 1 })],
    };
    const next = atencionReducer(start, A.atencionMutationSuccess({ item: created }));
    expect(next.list[0]).toBe(created);
    expect(next.list).toHaveLength(2);
  });

  it('atencionMutationFailure clears mutating and stores detailError', () => {
    const error = new HttpErrorResponse({ status: 409 });
    const start = { ...initialAtencionState, mutating: true };
    const next = atencionReducer(start, A.atencionMutationFailure({ error }));
    expect(next.mutating).toBe(false);
    expect(next.detailError).toBe(error);
  });

  it('loadAtencionSuccess sets detail and clears detailLoading', () => {
    const item = sample();
    const next = atencionReducer(
      { ...initialAtencionState, detailLoading: true },
      A.loadAtencionSuccess({ item })
    );
    expect(next.detail).toBe(item);
    expect(next.detailLoading).toBe(false);
  });

  it('loadAttentionPatient limpia resolvedPatient (evita mostrar el paciente anterior)', () => {
    const prev = { ...initialAtencionState, resolvedPatient: { id: 5 } as any };
    const state = atencionReducer(prev, A.loadAttentionPatient({ patientId: 9 }));
    expect(state.resolvedPatient).toBeNull();
  });

  it('resolvePatientByDni limpia guardians del paciente previo para evitar stale banner', () => {
    const staleGuardians = [
      { userPatientId: 10, titularNombre: 'Juan Titular', titularDni: '11223344', bond: 'PADRE', status: 'VERIFIED' as const },
    ];
    const prev = {
      ...initialAtencionState,
      resolvedPatient: samplePatient({ id: 5 }),
      guardians: staleGuardians,
    };
    const next = atencionReducer(prev, A.resolvePatientByDni({ dni: '99887766' }));
    expect(next.guardians).toEqual([]);
    expect(next.resolvedPatient).toBeNull();
    expect(next.patientResolving).toBe(true);
  });

  it('verifyPatient sets verifyingPatient=true', () => {
    const next = atencionReducer(initialAtencionState, A.verifyPatient({ id: 1 }));
    expect(next.verifyingPatient).toBe(true);
  });

  it('verifyPatientSuccess sets resolvedPatient to payload and verifyingPatient=false', () => {
    const patient = samplePatient({ id: 7, status: 'VERIFIED', source: 'PORTAL', verifiedAt: '2026-06-07T10:00:00Z' });
    const start = { ...initialAtencionState, verifyingPatient: true };
    const next = atencionReducer(start, A.verifyPatientSuccess({ patient }));
    expect(next.resolvedPatient).toBe(patient);
    expect(next.verifyingPatient).toBe(false);
  });

  it('verifyPatientFailure sets verifyingPatient=false', () => {
    const start = { ...initialAtencionState, verifyingPatient: true };
    const next = atencionReducer(start, A.verifyPatientFailure({ error: new HttpErrorResponse({ status: 422 }) }));
    expect(next.verifyingPatient).toBe(false);
  });

  it('resetAtencionWizard limpia detail, resolvedPatient, patientNotFoundDni, summaryAnalyses y pricing', () => {
    const populated = {
      ...initialAtencionState,
      detail: { id: 1 } as any,
      resolvedPatient: { id: 9 } as any,
      patientNotFoundDni: '123',
      summaryAnalyses: [{ id: 1 } as any],
      pricing: { total: 5 } as any,
    };
    const state = atencionReducer(populated, A.resetAtencionWizard());
    expect(state.detail).toBeNull();
    expect(state.resolvedPatient).toBeNull();
    expect(state.patientNotFoundDni).toBeNull();
    expect(state.summaryAnalyses).toEqual([]);
    expect(state.pricing).toBeNull();
  });

  // ── Guardians / family link ──────────────────────────────────────────────────

  it('loadPatientGuardians sets guardiansLoading=true', () => {
    const next = atencionReducer(initialAtencionState, A.loadPatientGuardians({ patientId: 42 }));
    expect(next.guardiansLoading).toBe(true);
  });

  it('loadPatientGuardiansSuccess populates guardians and clears guardiansLoading', () => {
    const guardians = [
      { userPatientId: 1, titularNombre: 'María García', titularDni: '22334455', bond: 'MADRE', status: 'CREATED' as const },
    ];
    const next = atencionReducer(
      { ...initialAtencionState, guardiansLoading: true },
      A.loadPatientGuardiansSuccess({ guardians }),
    );
    expect(next.guardians).toEqual(guardians);
    expect(next.guardiansLoading).toBe(false);
  });

  it('loadPatientGuardiansFailure clears guardiansLoading', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const next = atencionReducer(
      { ...initialAtencionState, guardiansLoading: true },
      A.loadPatientGuardiansFailure({ error }),
    );
    expect(next.guardiansLoading).toBe(false);
  });

  it('validateBond sets bondMutating=true', () => {
    const next = atencionReducer(initialAtencionState, A.validateBond({ userPatientId: 1, status: 'VERIFIED' }));
    expect(next.bondMutating).toBe(true);
  });

  it('validateBondSuccess actualiza el status del guardian correcto y limpia bondMutating', () => {
    const guardians = [
      { userPatientId: 1, titularNombre: 'María García', titularDni: '22334455', bond: 'MADRE', status: 'CREATED' as const },
      { userPatientId: 2, titularNombre: 'Carlos López', titularDni: '33445566', bond: 'PADRE', status: 'CREATED' as const },
    ];
    const start = { ...initialAtencionState, guardians, bondMutating: true };
    const next = atencionReducer(start, A.validateBondSuccess({ userPatientId: 1, status: 'VERIFIED' }));
    expect(next.bondMutating).toBe(false);
    expect(next.guardians[0].status).toBe('VERIFIED');
    expect(next.guardians[1].status).toBe('CREATED'); // no afectado
  });

  it('validateBondSuccess con status REJECTED actualiza el guardian correcto', () => {
    const guardians = [
      { userPatientId: 3, titularNombre: 'Ana Ruiz', titularDni: '44556677', bond: 'HERMANA', status: 'CREATED' as const },
    ];
    const start = { ...initialAtencionState, guardians, bondMutating: true };
    const next = atencionReducer(start, A.validateBondSuccess({ userPatientId: 3, status: 'REJECTED' }));
    expect(next.guardians[0].status).toBe('REJECTED');
    expect(next.bondMutating).toBe(false);
  });

  it('validateBondFailure clears bondMutating', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const start = { ...initialAtencionState, bondMutating: true };
    const next = atencionReducer(start, A.validateBondFailure({ error }));
    expect(next.bondMutating).toBe(false);
  });

  it('resetAtencionWizard limpia guardians junto al resto del wizard', () => {
    const populated = {
      ...initialAtencionState,
      guardians: [{ userPatientId: 1, titularNombre: 'X', titularDni: '1', bond: 'MADRE', status: 'CREATED' as const }],
    };
    const next = atencionReducer(populated, A.resetAtencionWizard());
    expect(next.guardians).toEqual([]);
  });
});
