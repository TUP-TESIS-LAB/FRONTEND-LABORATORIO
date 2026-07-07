import { HttpErrorResponse } from '@angular/common/http';
import { employeeReducer } from './employee.reducer';
import { initialEmployeeState } from './employee.state';
import {
  loadEmployees, loadEmployeesSuccess, loadEmployeesFailure,
  loadEmployeeSuccess, loadEmployeeContactsSuccess, clearSelectedEmployee,
  addEmployee, addEmployeeSuccess,
  updateEmployeeSuccess, toggleEmployeeStatusSuccess,
} from './employee.actions';
import { Employee, EmployeeContact } from '../models/employee.model';

const mk = (id: number, active = true): Employee => ({
  id, firstName: `f${id}`, lastName: `l${id}`, document: `${id}`,
  isBiochemist: false, registration: null, userId: null, active, hasSignature: false,
});
const contact = (id: number): EmployeeContact => ({ id, employeeId: 1, contactType: 'EMAIL', value: `c${id}@x.com` });

describe('employeeReducer', () => {
  it('loadEmployees sets pending and clears error', () => {
    const next = employeeReducer({ ...initialEmployeeState, error: { status: 1 } as HttpErrorResponse }, loadEmployees());
    expect(next.pending).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadEmployeesSuccess stores items, clears pending', () => {
    const next = employeeReducer({ ...initialEmployeeState, pending: true }, loadEmployeesSuccess({ employees: [mk(1)] }));
    expect(next.items.length).toBe(1);
    expect(next.pending).toBe(false);
  });

  it('loadEmployeesFailure stores error', () => {
    const err = { status: 500 } as HttpErrorResponse;
    const next = employeeReducer({ ...initialEmployeeState, pending: true }, loadEmployeesFailure({ error: err }));
    expect(next.error).toBe(err);
    expect(next.pending).toBe(false);
  });

  it('loadEmployeeSuccess stores selected', () => {
    const next = employeeReducer(initialEmployeeState, loadEmployeeSuccess({ employee: mk(9) }));
    expect(next.selected?.id).toBe(9);
  });

  it('loadEmployeeContactsSuccess stores selectedContacts', () => {
    const next = employeeReducer(initialEmployeeState, loadEmployeeContactsSuccess({ contacts: [contact(1)] }));
    expect(next.selectedContacts.length).toBe(1);
  });

  it('addEmployee sets pending; addEmployeeSuccess appends', () => {
    const after = employeeReducer(initialEmployeeState, addEmployee({
      req: { firstName: 'a', lastName: 'b', document: '1', isBiochemist: false }, contacts: [],
    }));
    expect(after.pending).toBe(true);
    const final = employeeReducer({ ...after, items: [mk(2)] }, addEmployeeSuccess({ employee: mk(1) }));
    expect(final.items.map((e) => e.id)).toEqual([2, 1]);
    expect(final.pending).toBe(false);
  });

  it('updateEmployeeSuccess replaces by id and updates selected', () => {
    const before = { ...initialEmployeeState, items: [mk(1), mk(2)], selected: mk(1) };
    const updated = { ...mk(1), firstName: 'changed' };
    const next = employeeReducer(before, updateEmployeeSuccess({ employee: updated }));
    expect(next.items[0].firstName).toBe('changed');
    expect(next.selected?.firstName).toBe('changed');
  });

  it('toggleEmployeeStatusSuccess replaces the item with the returned employee', () => {
    const before = { ...initialEmployeeState, items: [mk(1, true)] };
    const next = employeeReducer(before, toggleEmployeeStatusSuccess({ employee: mk(1, false) }));
    expect(next.items[0].active).toBe(false);
  });

  it('clearSelectedEmployee resets selected and contacts', () => {
    const before = { ...initialEmployeeState, selected: mk(1), selectedContacts: [contact(1)] };
    const next = employeeReducer(before, clearSelectedEmployee());
    expect(next.selected).toBeNull();
    expect(next.selectedContacts).toEqual([]);
  });
});
