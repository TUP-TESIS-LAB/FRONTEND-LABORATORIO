import { HttpErrorResponse } from '@angular/common/http';
import { patientReducer } from './patient.reducer';
import { initialPatientState } from './patient.state';
import {
  loadPatients, loadPatientsSuccess, loadPatientsFailure,
  setPatientPageRequest,
  loadPatient, loadPatientSuccess, clearSelectedPatient,
  addPatient, addPatientSuccess, addPatientFailure,
  updatePatient, updatePatientSuccess,
  togglePatientActive, togglePatientActiveSuccess,
  checkPatientDniSuccess,
} from './patient.actions';
import { Patient } from '../models/patient.model';

const mkPatient = (id: number, active = true): Patient => ({
  id, dni: `${id}`, firstName: `f${id}`, lastName: `l${id}`,
  birthDate: '1990-01-01', gender: 'FEMALE', sexAtBirth: 'FEMALE',
  status: 'MIN', contacts: [], addresses: [], coverages: [], active,
});

describe('patientReducer', () => {
  it('loadPatients sets pending=true and clears error', () => {
    const before = { ...initialPatientState, error: { status: 500 } as HttpErrorResponse };
    const next = patientReducer(before, loadPatients({ req: initialPatientState.pageRequest }));
    expect(next.pending).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadPatientsSuccess replaces items and totals, clears pending', () => {
    const result = { content: [mkPatient(1)], totalElements: 1, totalPages: 1, page: 0, size: 20 };
    const next = patientReducer({ ...initialPatientState, pending: true }, loadPatientsSuccess({ result }));
    expect(next.items.length).toBe(1);
    expect(next.totalElements).toBe(1);
    expect(next.pending).toBe(false);
  });

  it('loadPatientsFailure stores error and clears pending', () => {
    const err = { status: 500 } as HttpErrorResponse;
    const next = patientReducer({ ...initialPatientState, pending: true }, loadPatientsFailure({ error: err }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(err);
  });

  it('setPatientPageRequest merges patch', () => {
    const next = patientReducer(initialPatientState, setPatientPageRequest({ patch: { q: 'gar', page: 2 } }));
    expect(next.pageRequest).toEqual({ ...initialPatientState.pageRequest, q: 'gar', page: 2 });
  });

  it('loadPatient sets pending=true', () => {
    const next = patientReducer(initialPatientState, loadPatient({ id: 5 }));
    expect(next.pending).toBe(true);
  });

  it('loadPatientSuccess stores selected and clears pending', () => {
    const next = patientReducer({ ...initialPatientState, pending: true }, loadPatientSuccess({ patient: mkPatient(5) }));
    expect(next.selected?.id).toBe(5);
    expect(next.pending).toBe(false);
  });

  it('clearSelectedPatient sets selected=null', () => {
    const next = patientReducer({ ...initialPatientState, selected: mkPatient(1) }, clearSelectedPatient());
    expect(next.selected).toBeNull();
  });

  it('addPatient and addPatientSuccess (pessimistic — appends without reload)', () => {
    const after = patientReducer(initialPatientState, addPatient({ req: { dni: '1', firstName: 'a', lastName: 'b', birthDate: null, gender: null, sexAtBirth: null, contacts: [], addresses: [], coverages: [] } }));
    expect(after.pending).toBe(true);
    const final = patientReducer({ ...after, items: [mkPatient(2)] }, addPatientSuccess({ patient: mkPatient(1) }));
    expect(final.items.map((p) => p.id)).toEqual([2, 1]);
    expect(final.pending).toBe(false);
  });

  it('addPatientFailure stores error and clears pending', () => {
    const err = { status: 409 } as HttpErrorResponse;
    const next = patientReducer({ ...initialPatientState, pending: true }, addPatientFailure({ error: err }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(err);
  });

  it('updatePatientSuccess replaces item by id and updates selected if matches', () => {
    const before = { ...initialPatientState, items: [mkPatient(1), mkPatient(2)], selected: mkPatient(1) };
    const updated = { ...mkPatient(1), firstName: 'changed' };
    const next = patientReducer(before, updatePatientSuccess({ patient: updated }));
    expect(next.items[0].firstName).toBe('changed');
    expect(next.items[1].firstName).toBe('f2');
    expect(next.selected?.firstName).toBe('changed');
  });

  it('togglePatientActiveSuccess flips active on the targeted item only', () => {
    const before = { ...initialPatientState, items: [mkPatient(1, true), mkPatient(2, true)] };
    const next = patientReducer(before, togglePatientActiveSuccess({ id: 1, deleted: true }));
    expect(next.items[0].active).toBe(false);
    expect(next.items[1].active).toBe(true);
  });

  it('togglePatientActive sets pending', () => {
    const next = patientReducer(initialPatientState, togglePatientActive({ id: 1, deleted: true }));
    expect(next.pending).toBe(true);
  });

  it('checkPatientDniSuccess stores last check', () => {
    const next = patientReducer(initialPatientState, checkPatientDniSuccess({ dni: '32456789', exists: true }));
    expect(next.dniCheck).toEqual({ dni: '32456789', exists: true });
  });
});
