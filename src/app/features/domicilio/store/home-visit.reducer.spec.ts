import { describe, expect, it } from 'vitest';
import { homeVisitReducer } from './home-visit.reducer';
import { initialDomicilioState } from './home-visit.state';
import {
  loadHomeVisits,
  loadHomeVisitsSuccess,
  loadHomeVisitsFailure,
  createHomeVisit,
  createHomeVisitSuccess,
  createHomeVisitFailure,
  loadMyRoute,
  loadMyRouteSuccess,
  loadMyRouteNotModified,
  loadMyRouteFailure,
  loadVisitDetail,
  loadVisitDetailSuccess,
  loadVisitDetailFailure,
  markExtracted,
  markExtractedSuccess,
  markExtractedFailure,
  markOutcome,
  markOutcomeSuccess,
  markOutcomeFailure,
  rescheduleVisit,
  rescheduleVisitSuccess,
  rescheduleVisitFailure,
} from './home-visit.actions';
import { HomeVisit } from '../models/home-visit.model';

const visit: HomeVisit = {
  id: 1,
  appointmentId: 10,
  patientId: 20,
  branchId: 1,
  assignedExtractorId: null,
  addressStreet: 'Av. Libertad',
  addressNumber: '123',
  addressCity: 'La Plata',
  addressReferences: null,
  timeWindowStart: '08:00:00',
  timeWindowEnd: '10:00:00',
  status: 'PROGRAMADA',
  scheduledAt: '2026-07-01T09:00:00',
  patientName: 'Juan García',
  patientDni: '30123456',
  extractorName: 'Ana López',
};

describe('homeVisitReducer — estado inicial', () => {
  it('tiene visits vacío, pending false y error null', () => {
    const state = homeVisitReducer(undefined, { type: '@@INIT' } as any);
    expect(state.visits).toEqual([]);
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe('homeVisitReducer — loadHomeVisits', () => {
  it('marca pending:true y limpia error', () => {
    const state = homeVisitReducer(initialDomicilioState, loadHomeVisits({ branchId: 1 }));
    expect(state.pending).toBe(true);
    expect(state.error).toBeNull();
  });

  it('loadHomeVisitsSuccess setea la lista y baja pending', () => {
    const loading = homeVisitReducer(initialDomicilioState, loadHomeVisits({ branchId: 1 }));
    const state = homeVisitReducer(loading, loadHomeVisitsSuccess({ visits: [visit] }));
    expect(state.visits).toHaveLength(1);
    expect(state.visits[0].id).toBe(1);
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loadHomeVisitsFailure guarda el error y baja pending', () => {
    const loading = homeVisitReducer(initialDomicilioState, loadHomeVisits({ branchId: 1 }));
    const state = homeVisitReducer(loading, loadHomeVisitsFailure({ error: 'Error de red' }));
    expect(state.pending).toBe(false);
    expect(state.error).toBe('Error de red');
    expect(state.visits).toEqual([]);
  });
});

describe('homeVisitReducer — createHomeVisit', () => {
  it('marca pending:true y limpia error', () => {
    const payload = {
      patientId: 20,
      branchId: 1,
      scheduledAt: '2026-07-01T09:00:00',
      addressStreet: 'Av. Libertad',
      addressCity: 'La Plata',
      timeWindowStart: '08:00:00',
      timeWindowEnd: '10:00:00',
    };
    const state = homeVisitReducer(initialDomicilioState, createHomeVisit({ payload }));
    expect(state.pending).toBe(true);
    expect(state.error).toBeNull();
  });

  it('createHomeVisitSuccess baja pending y mantiene visits intactos', () => {
    const withVisit = homeVisitReducer(
      initialDomicilioState,
      loadHomeVisitsSuccess({ visits: [visit] }),
    );
    const state = homeVisitReducer(withVisit, createHomeVisitSuccess({ id: 2 }));
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
    expect(state.visits).toHaveLength(1);
  });

  it('createHomeVisitFailure guarda el error y baja pending', () => {
    const state = homeVisitReducer(
      { ...initialDomicilioState, pending: true },
      createHomeVisitFailure({ error: 'Los datos de la visita son inválidos. Revisá los campos e intentá de nuevo.' }),
    );
    expect(state.pending).toBe(false);
    expect(state.error).toBe('Los datos de la visita son inválidos. Revisá los campos e intentá de nuevo.');
  });

  it('no muta el array de visits al crear', () => {
    const withVisit = homeVisitReducer(
      initialDomicilioState,
      loadHomeVisitsSuccess({ visits: [visit] }),
    );
    const state = homeVisitReducer(withVisit, createHomeVisitSuccess({ id: 2 }));
    expect(state.visits).toBe(withVisit.visits);
  });
});

describe('homeVisitReducer — loadMyRoute', () => {
  it('loadMyRoute marca myRoutePending:true y limpia routeError', () => {
    const state = homeVisitReducer(initialDomicilioState, loadMyRoute({}));
    expect(state.myRoutePending).toBe(true);
    expect(state.routeError).toBeNull();
  });

  it('loadMyRouteSuccess setea la lista y baja myRoutePending', () => {
    const loading = homeVisitReducer(initialDomicilioState, loadMyRoute({}));
    const state = homeVisitReducer(loading, loadMyRouteSuccess({ visits: [visit] }));
    expect(state.myRoute).toHaveLength(1);
    expect(state.myRoute[0].id).toBe(1);
    expect(state.myRoutePending).toBe(false);
    expect(state.routeError).toBeNull();
  });

  it('loadMyRouteNotModified baja myRoutePending y limpia routeError', () => {
    const withRoute = homeVisitReducer(
      { ...initialDomicilioState, myRoute: [visit], routeError: 'Ocurrió un error al procesar la operación. Intentá de nuevo.' },
      loadMyRoute({}),
    );
    const state = homeVisitReducer(withRoute, loadMyRouteNotModified());
    expect(state.myRoute).toBe(withRoute.myRoute);
    expect(state.myRoutePending).toBe(false);
    expect(state.routeError).toBeNull();
  });

  it('loadMyRouteFailure guarda el mensaje mapeado y baja myRoutePending', () => {
    const loading = homeVisitReducer(initialDomicilioState, loadMyRoute({}));
    const state = homeVisitReducer(loading, loadMyRouteFailure({ error: 'Ocurrió un error al procesar la operación. Intentá de nuevo.' }));
    expect(state.myRoutePending).toBe(false);
    expect(state.routeError).toBe('Ocurrió un error al procesar la operación. Intentá de nuevo.');
    expect(state.myRoute).toEqual([]);
  });
});

describe('homeVisitReducer — loadVisitDetail', () => {
  it('loadVisitDetail marca detailPending:true y limpia detailError', () => {
    const state = homeVisitReducer(initialDomicilioState, loadVisitDetail({ id: 1 }));
    expect(state.detailPending).toBe(true);
    expect(state.detailError).toBeNull();
  });

  it('loadVisitDetailSuccess setea visitDetail y baja detailPending', () => {
    const loading = homeVisitReducer(initialDomicilioState, loadVisitDetail({ id: 1 }));
    const state = homeVisitReducer(loading, loadVisitDetailSuccess({ visit }));
    expect(state.visitDetail).toEqual(visit);
    expect(state.detailPending).toBe(false);
    expect(state.detailError).toBeNull();
  });

  it('loadVisitDetailFailure guarda el mensaje mapeado y baja detailPending', () => {
    const loading = homeVisitReducer(initialDomicilioState, loadVisitDetail({ id: 99 }));
    const state = homeVisitReducer(loading, loadVisitDetailFailure({ error: 'La visita solicitada no existe.' }));
    expect(state.detailPending).toBe(false);
    expect(state.detailError).toBe('La visita solicitada no existe.');
    expect(state.visitDetail).toBeNull();
  });
});

describe('homeVisitReducer — markExtracted', () => {
  it('markExtracted sube actionPending', () => {
    const state = homeVisitReducer(initialDomicilioState, markExtracted({ id: 1 }));
    expect(state.actionPending).toBe(true);
  });

  it('markExtractedSuccess baja actionPending y actualiza visitDetail', () => {
    const updatedVisit = { ...visit, status: 'EXTRAIDA' as const };
    const loading = homeVisitReducer(initialDomicilioState, markExtracted({ id: 1 }));
    const state = homeVisitReducer(loading, markExtractedSuccess({ visit: updatedVisit }));
    expect(state.actionPending).toBe(false);
    expect(state.visitDetail).toEqual(updatedVisit);
  });

  it('markExtractedFailure baja actionPending sin modificar visitDetail', () => {
    const withDetail = { ...initialDomicilioState, visitDetail: visit, actionPending: true };
    const state = homeVisitReducer(withDetail, markExtractedFailure({ error: 'La visita ya fue procesada y no admite esta acción.' }));
    expect(state.actionPending).toBe(false);
    expect(state.visitDetail).toEqual(visit);
  });
});

describe('homeVisitReducer — markOutcome', () => {
  it('markOutcome sube actionPending', () => {
    const state = homeVisitReducer(initialDomicilioState, markOutcome({ id: 1, reason: 'PACIENTE_AUSENTE' }));
    expect(state.actionPending).toBe(true);
  });

  it('markOutcomeSuccess baja actionPending y actualiza visitDetail', () => {
    const updatedVisit = { ...visit, status: 'NO_REALIZADA' as const };
    const loading = homeVisitReducer(initialDomicilioState, markOutcome({ id: 1, reason: 'PACIENTE_AUSENTE' }));
    const state = homeVisitReducer(loading, markOutcomeSuccess({ visit: updatedVisit }));
    expect(state.actionPending).toBe(false);
    expect(state.visitDetail).toEqual(updatedVisit);
  });

  it('markOutcomeFailure baja actionPending sin modificar visitDetail', () => {
    const withDetail = { ...initialDomicilioState, visitDetail: visit, actionPending: true };
    const state = homeVisitReducer(withDetail, markOutcomeFailure({ error: 'La visita ya fue procesada y no admite esta acción.' }));
    expect(state.actionPending).toBe(false);
    expect(state.visitDetail).toEqual(visit);
  });
});

describe('homeVisitReducer — rescheduleVisit', () => {
  it('rescheduleVisit sube actionPending', () => {
    const state = homeVisitReducer(initialDomicilioState, rescheduleVisit({ id: 1 }));
    expect(state.actionPending).toBe(true);
  });

  it('rescheduleVisitSuccess baja actionPending y actualiza visitDetail', () => {
    const updatedVisit = { ...visit, status: 'REPROGRAMADA' as const };
    const loading = homeVisitReducer(initialDomicilioState, rescheduleVisit({ id: 1 }));
    const state = homeVisitReducer(loading, rescheduleVisitSuccess({ visit: updatedVisit }));
    expect(state.actionPending).toBe(false);
    expect(state.visitDetail).toEqual(updatedVisit);
  });

  it('rescheduleVisitFailure baja actionPending sin modificar visitDetail', () => {
    const withDetail = { ...initialDomicilioState, visitDetail: visit, actionPending: true };
    const state = homeVisitReducer(withDetail, rescheduleVisitFailure({ error: 'La visita ya fue procesada y no admite esta acción.' }));
    expect(state.actionPending).toBe(false);
    expect(state.visitDetail).toEqual(visit);
  });
});
