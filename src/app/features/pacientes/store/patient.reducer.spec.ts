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
  verifyPatientSuccess,
  createPatientPortalAccount, createPatientPortalAccountSuccess, createPatientPortalAccountFailure,
  resendPatientPortalAccess, resendPatientPortalAccessSuccess, resendPatientPortalAccessFailure,
} from './patient.actions';
import { Patient } from '../models/patient.model';

const mkPatient = (id: number, active = true): Patient => ({
  id, dni: `${id}`, firstName: `f${id}`, lastName: `l${id}`,
  birthDate: '1990-01-01', gender: 'FEMALE', sexAtBirth: 'FEMALE',
  status: 'MIN', source: 'STAFF', verifiedAt: null, contacts: [], addresses: [], coverages: [], active,
  accountStatus: 'NONE',
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

  it('verifyPatientSuccess replaces item by id and updates selected if matches (sin tocar pending)', () => {
    const before = { ...initialPatientState, items: [mkPatient(1), mkPatient(2)], selected: mkPatient(1) };
    const verified = { ...mkPatient(1), verifiedAt: '2026-06-09T10:00:00Z', status: 'VERIFIED' as const };
    const next = patientReducer(before, verifyPatientSuccess({ patient: verified }));
    expect(next.items[0].verifiedAt).toBe('2026-06-09T10:00:00Z');
    expect(next.items[1].verifiedAt).toBeNull();
    expect(next.selected?.verifiedAt).toBe('2026-06-09T10:00:00Z');
    // El guardado ya limpió pending; verify es background y no debe alterarlo.
    expect(next.pending).toBe(before.pending);
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

  it('createPatientPortalAccount sets pending=true', () => {
    const next = patientReducer(initialPatientState, createPatientPortalAccount({ id: 1 }));
    expect(next.pending).toBe(true);
  });

  it('createPatientPortalAccountSuccess marca accountStatus PENDING en el paciente y clears pending', () => {
    const before = { ...initialPatientState, items: [mkPatient(1), mkPatient(2)], selected: mkPatient(1), pending: true };
    const next = patientReducer(before, createPatientPortalAccountSuccess({ id: 1 }));
    expect(next.items[0].accountStatus).toBe('PENDING');
    expect(next.items[1].accountStatus).toBe('NONE'); // no tocado
    expect(next.selected?.accountStatus).toBe('PENDING');
    expect(next.pending).toBe(false);
    expect(next.error).toBeNull();
  });

  it('createPatientPortalAccountSuccess actualiza selected solo si coincide el id', () => {
    const before = { ...initialPatientState, items: [mkPatient(1), mkPatient(2)], selected: mkPatient(2), pending: true };
    const next = patientReducer(before, createPatientPortalAccountSuccess({ id: 1 }));
    expect(next.items[0].accountStatus).toBe('PENDING');
    expect(next.selected?.accountStatus).toBe('NONE'); // selected es id=2, no cambia
  });

  it('createPatientPortalAccountFailure stores error y clears pending', () => {
    const err = { status: 409 } as HttpErrorResponse;
    const next = patientReducer({ ...initialPatientState, pending: true }, createPatientPortalAccountFailure({ error: err }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(err);
  });

  it('resendPatientPortalAccess sets pending=true', () => {
    const next = patientReducer(initialPatientState, resendPatientPortalAccess({ id: 1 }));
    expect(next.pending).toBe(true);
  });

  it('resendPatientPortalAccessSuccess NO cambia accountStatus, solo clears pending', () => {
    const before = { ...initialPatientState, items: [mkPatient(1)], selected: mkPatient(1), pending: true };
    const next = patientReducer(before, resendPatientPortalAccessSuccess({ id: 1 }));
    expect(next.items[0].accountStatus).toBe('NONE'); // sin cambio
    expect(next.pending).toBe(false);
    expect(next.error).toBeNull();
  });

  it('resendPatientPortalAccessFailure stores error y clears pending', () => {
    const err = { status: 404 } as HttpErrorResponse;
    const next = patientReducer({ ...initialPatientState, pending: true }, resendPatientPortalAccessFailure({ error: err }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(err);
  });
});
