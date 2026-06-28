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
