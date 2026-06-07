import { HttpErrorResponse } from '@angular/common/http';
import { AttentionResponse, AttentionState } from '../../models/atencion.model';
import * as A from './atencion.actions';
import { atencionReducer } from './atencion.reducer';
import { initialAtencionState } from './atencion.state';

function sample(over: Partial<AttentionResponse> = {}): AttentionResponse {
  return {
    id: 1,
    tenantId: 1,
    attentionNumber: 'A-001',
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
});
