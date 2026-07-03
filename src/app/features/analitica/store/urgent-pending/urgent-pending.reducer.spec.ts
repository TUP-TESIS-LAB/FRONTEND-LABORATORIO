import { HttpErrorResponse } from '@angular/common/http';
import { AttentionResponse, AttentionState } from '../../models/atencion.model';
import * as A from './urgent-pending.actions';
import { urgentPendingReducer } from './urgent-pending.reducer';
import { initialUrgentPendingState } from './urgent-pending.state';

function row(over: Partial<AttentionResponse> = {}): AttentionResponse {
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
    isUrgent: true,
    authorizationNumber: null,
    observations: null,
    cancellationReason: null,
    cancelledAtState: null,
    attentionState: AttentionState.AWAITING_EXTRACTION,
    mostAdvancedState: AttentionState.AWAITING_EXTRACTION,
    analysisAuthorizations: [],
    copaymentAmount: null,
    cobroPendiente: true,
    autorizacionPendiente: true,
    datosAdministrativosIncompletos: true,
    ...over,
  };
}

describe('urgentPendingReducer', () => {

  // ── loadUrgentPending ──────────────────────────────────────────────────────

  it('loadUrgentPending sets loading=true and clears error', () => {
    const start = { ...initialUrgentPendingState, error: new HttpErrorResponse({ status: 500 }) };
    const next = urgentPendingReducer(start, A.loadUrgentPending());
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadUrgentPendingSuccess setea items', () => {
    const items = [row()];
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, loading: true },
      A.loadUrgentPendingSuccess({ items }),
    );
    expect(s.items.length).toBe(1);
    expect(s.loading).toBe(false);
  });

  it('loadUrgentPendingNotModified no toca items', () => {
    const items = [row()];
    const start = { ...initialUrgentPendingState, items, loading: true };
    const s = urgentPendingReducer(start, A.loadUrgentPendingNotModified());
    expect(s.items).toBe(items); // same reference
    expect(s.loading).toBe(false);
  });

  it('loadUrgentPendingFailure stores error and clears loading', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, loading: true },
      A.loadUrgentPendingFailure({ error }),
    );
    expect(s.error).toBe(error);
    expect(s.loading).toBe(false);
  });

  // ── resolveAuth ────────────────────────────────────────────────────────────

  it('resolveAuth sets resolving=true', () => {
    const s = urgentPendingReducer(initialUrgentPendingState, A.resolveAuth({ id: 1, authorizationNumber: 'AUTH-1' }));
    expect(s.resolving).toBe(true);
  });

  it('resolveAuthSuccess reemplaza la fila en items (aún tiene pendientes → permanece)', () => {
    const original = row();
    const updated = row({ authorizationNumber: 'AUTH-1', autorizacionPendiente: false });
    // cobroPendiente y datosAdministrativosIncompletos siguen true → permanece en bandeja
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, items: [original], resolving: true },
      A.resolveAuthSuccess({ item: updated }),
    );
    expect(s.items.length).toBe(1);
    expect(s.items[0].authorizationNumber).toBe('AUTH-1');
    expect(s.resolving).toBe(false);
  });

  it('resolveAuthSuccess quita la fila si ya no tiene pendientes', () => {
    const updated = row({
      autorizacionPendiente: false,
      cobroPendiente: false,
      datosAdministrativosIncompletos: false,
    });
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, items: [row()], resolving: true },
      A.resolveAuthSuccess({ item: updated }),
    );
    expect(s.items.length).toBe(0);
  });

  it('resolveAuthFailure clears resolving', () => {
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, resolving: true },
      A.resolveAuthFailure({ error: new HttpErrorResponse({ status: 500 }) }),
    );
    expect(s.resolving).toBe(false);
  });

  // ── resolveDatos ───────────────────────────────────────────────────────────

  it('resolveDatos sets resolving=true', () => {
    const s = urgentPendingReducer(initialUrgentPendingState, A.resolveDatos({ id: 1, doctorId: 5 }));
    expect(s.resolving).toBe(true);
  });

  it('resolveDatosSuccess reemplaza la fila (aún tiene pendientes → permanece)', () => {
    const original = row();
    const updated = row({ doctorId: 5, datosAdministrativosIncompletos: false });
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, items: [original], resolving: true },
      A.resolveDatosSuccess({ item: updated }),
    );
    expect(s.items.length).toBe(1);
    expect(s.items[0].doctorId).toBe(5);
  });

  it('resolveDatosSuccess quita la fila si ya no tiene pendientes', () => {
    const updated = row({
      datosAdministrativosIncompletos: false,
      cobroPendiente: false,
      autorizacionPendiente: false,
    });
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, items: [row()], resolving: true },
      A.resolveDatosSuccess({ item: updated }),
    );
    expect(s.items.length).toBe(0);
  });

  it('resolveDatosFailure clears resolving', () => {
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, resolving: true },
      A.resolveDatosFailure({ error: new HttpErrorResponse({ status: 500 }) }),
    );
    expect(s.resolving).toBe(false);
  });

  // ── resolveCobro ───────────────────────────────────────────────────────────

  it('resolveCobro sets resolving=true', () => {
    const s = urgentPendingReducer(initialUrgentPendingState, A.resolveCobro({ id: 1 }));
    expect(s.resolving).toBe(true);
  });

  it('resolveCobroSuccess reemplaza la fila (aún tiene pendientes → permanece)', () => {
    const original = row();
    const updated = row({ cobroPendiente: false });
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, items: [original], resolving: true },
      A.resolveCobroSuccess({ item: updated }),
    );
    expect(s.items.length).toBe(1);
    expect(s.items[0].cobroPendiente).toBe(false);
  });

  it('resolveCobroSuccess reemplaza/quita la fila', () => {
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, items: [row()], resolving: true },
      A.resolveCobroSuccess({ item: { ...row(), cobroPendiente: false, autorizacionPendiente: false, datosAdministrativosIncompletos: false } }),
    );
    // si ya no tiene pendientes → fuera de la bandeja
    expect(s.items.length).toBe(0);
  });

  it('resolveCobroSuccess mantiene la fila cuando los 3 flags son undefined (guarda de undefined)', () => {
    // Los 3 flags undefined NO equivalen a "sin pendientes" — la fila debe permanecer.
    const itemWithUndefinedFlags = {
      ...row(),
      cobroPendiente: undefined as unknown as boolean,
      autorizacionPendiente: undefined as unknown as boolean,
      datosAdministrativosIncompletos: undefined as unknown as boolean,
    };
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, items: [row()], resolving: true },
      A.resolveCobroSuccess({ item: itemWithUndefinedFlags }),
    );
    expect(s.items.length).toBe(1);
  });

  it('resolveCobroFailure clears resolving', () => {
    const s = urgentPendingReducer(
      { ...initialUrgentPendingState, resolving: true },
      A.resolveCobroFailure({ error: new HttpErrorResponse({ status: 500 }) }),
    );
    expect(s.resolving).toBe(false);
  });
});
