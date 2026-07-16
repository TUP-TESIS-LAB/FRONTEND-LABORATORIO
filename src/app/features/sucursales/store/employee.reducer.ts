import { createReducer, on } from '@ngrx/store';
import { EmployeeState, initialEmployeeState } from './employee.state';
import {
  loadEmployees, loadEmployeesSuccess, loadEmployeesFailure,
  loadEmployee, loadEmployeeSuccess, loadEmployeeFailure,
  loadEmployeeContacts, loadEmployeeContactsSuccess, loadEmployeeContactsFailure,
  clearSelectedEmployee,
  addEmployee, addEmployeeSuccess, addEmployeeFailure,
  updateEmployee, updateEmployeeSuccess, updateEmployeeFailure,
  toggleEmployeeStatus, toggleEmployeeStatusSuccess, toggleEmployeeStatusFailure,
} from './employee.actions';

export const employeeReducer = createReducer(
  initialEmployeeState,

  on(loadEmployees, (s): EmployeeState => ({ ...s, pending: true, error: null })),
  on(loadEmployee, (s): EmployeeState => ({ ...s, pending: true, error: null })),
  on(addEmployee, (s): EmployeeState => ({ ...s, pending: true, error: null })),
  on(updateEmployee, (s): EmployeeState => ({ ...s, pending: true, error: null })),
  on(toggleEmployeeStatus, (s): EmployeeState => ({ ...s, pending: true, error: null })),
  on(loadEmployeeContacts, (s): EmployeeState => ({ ...s, error: null })),

  on(loadEmployeesSuccess, (s, { employees }): EmployeeState => ({ ...s, items: employees, pending: false, error: null })),
  on(loadEmployeeSuccess, (s, { employee }): EmployeeState => ({ ...s, selected: employee, pending: false, error: null })),
  on(loadEmployeeContactsSuccess, (s, { contacts }): EmployeeState => ({ ...s, selectedContacts: contacts, error: null })),
  on(addEmployeeSuccess, (s, { employee }): EmployeeState => ({ ...s, items: [...s.items, employee], pending: false, error: null })),
  on(updateEmployeeSuccess, (s, { employee }): EmployeeState => ({
    ...s,
    items: s.items.map((e) => (e.id === employee.id ? employee : e)),
    selected: s.selected?.id === employee.id ? employee : s.selected,
    pending: false, error: null,
  })),
  on(toggleEmployeeStatusSuccess, (s, { employee }): EmployeeState => ({
    ...s, items: s.items.map((e) => (e.id === employee.id ? employee : e)), pending: false, error: null,
  })),

  on(loadEmployeesFailure, (s, { error }): EmployeeState => ({ ...s, pending: false, error })),
  on(loadEmployeeFailure, (s, { error }): EmployeeState => ({ ...s, pending: false, error })),
  on(loadEmployeeContactsFailure, (s, { error }): EmployeeState => ({ ...s, error })),
  on(addEmployeeFailure, (s, { error }): EmployeeState => ({ ...s, pending: false, error })),
  on(updateEmployeeFailure, (s, { error }): EmployeeState => ({ ...s, pending: false, error })),
  on(toggleEmployeeStatusFailure, (s, { error }): EmployeeState => ({ ...s, pending: false, error })),

  on(clearSelectedEmployee, (s): EmployeeState => ({ ...s, selected: null, selectedContacts: [] })),
);
