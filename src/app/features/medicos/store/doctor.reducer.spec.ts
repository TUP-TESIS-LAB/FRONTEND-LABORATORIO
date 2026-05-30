import { HttpErrorResponse } from '@angular/common/http';
import { doctorReducer } from './doctor.reducer';
import { initialDoctorState } from './doctor.state';
import {
  loadDoctors, loadDoctorsSuccess, loadDoctorsFailure,
  loadDoctorSuccess, clearSelectedDoctor,
  addDoctor, addDoctorSuccess,
  updateDoctorSuccess,
  toggleDoctorStatusSuccess,
  deleteDoctorSuccess,
} from './doctor.actions';
import { Doctor } from '../models/doctor.model';

const mk = (id: number, active = true): Doctor => ({
  id, firstName: `f${id}`, lastName: `l${id}`, tuition: `M${id}`,
  registrationType: 'NACIONAL', active,
});

describe('doctorReducer', () => {
  it('loadDoctors sets pending=true and clears error', () => {
    const before = { ...initialDoctorState, error: { status: 500 } as HttpErrorResponse };
    const next = doctorReducer(before, loadDoctors());
    expect(next.pending).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadDoctorsSuccess stores items and clears pending', () => {
    const next = doctorReducer({ ...initialDoctorState, pending: true }, loadDoctorsSuccess({ doctors: [mk(1)] }));
    expect(next.items.length).toBe(1);
    expect(next.pending).toBe(false);
  });

  it('loadDoctorsFailure stores error and clears pending', () => {
    const err = { status: 500 } as HttpErrorResponse;
    const next = doctorReducer({ ...initialDoctorState, pending: true }, loadDoctorsFailure({ error: err }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(err);
  });

  it('loadDoctorSuccess stores selected', () => {
    const next = doctorReducer(initialDoctorState, loadDoctorSuccess({ doctor: mk(7) }));
    expect(next.selected?.id).toBe(7);
  });

  it('clearSelectedDoctor sets selected=null', () => {
    const next = doctorReducer({ ...initialDoctorState, selected: mk(1) }, clearSelectedDoctor());
    expect(next.selected).toBeNull();
  });

  it('addDoctor sets pending; addDoctorSuccess appends', () => {
    const after = doctorReducer(initialDoctorState, addDoctor({ req: { firstName: 'a', lastName: 'b', tuition: 'M9', registrationType: 'PROVINCIAL' } }));
    expect(after.pending).toBe(true);
    const final = doctorReducer({ ...after, items: [mk(2)] }, addDoctorSuccess({ doctor: mk(1) }));
    expect(final.items.map((d) => d.id)).toEqual([2, 1]);
    expect(final.pending).toBe(false);
  });

  it('updateDoctorSuccess replaces by id and updates selected if matches', () => {
    const before = { ...initialDoctorState, items: [mk(1), mk(2)], selected: mk(1) };
    const updated = { ...mk(1), firstName: 'changed' };
    const next = doctorReducer(before, updateDoctorSuccess({ doctor: updated }));
    expect(next.items[0].firstName).toBe('changed');
    expect(next.items[1].firstName).toBe('f2');
    expect(next.selected?.firstName).toBe('changed');
  });

  it('toggleDoctorStatusSuccess replaces the item with the returned doctor', () => {
    const before = { ...initialDoctorState, items: [mk(1, true)] };
    const next = doctorReducer(before, toggleDoctorStatusSuccess({ doctor: mk(1, false) }));
    expect(next.items[0].active).toBe(false);
  });

  it('deleteDoctorSuccess removes the item', () => {
    const before = { ...initialDoctorState, items: [mk(1), mk(2)] };
    const next = doctorReducer(before, deleteDoctorSuccess({ id: 1 }));
    expect(next.items.map((d) => d.id)).toEqual([2]);
  });
});
