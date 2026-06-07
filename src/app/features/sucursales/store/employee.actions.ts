import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { CrearUsuarioPayload } from '@features/empresa/models/usuario.model';
import {
  CreateEmployeeRequest, Employee, EmployeeContact, EmployeeContactInput, UpdateEmployeeRequest,
} from '../models/employee.model';

export const loadEmployees = createAction('[Employees Page] Load Employees');
export const loadEmployeesSuccess = createAction(
  '[Employees API] Load Employees Success', props<{ employees: Employee[] }>());
export const loadEmployeesFailure = createAction(
  '[Employees API] Load Employees Failure', props<{ error: HttpErrorResponse }>());

export const loadEmployee = createAction('[Employee Form] Load Employee', props<{ id: number }>());
export const loadEmployeeSuccess = createAction(
  '[Employees API] Load Employee Success', props<{ employee: Employee }>());
export const loadEmployeeFailure = createAction(
  '[Employees API] Load Employee Failure', props<{ error: HttpErrorResponse }>());

export const loadEmployeeContacts = createAction(
  '[Employee Form] Load Employee Contacts', props<{ employeeId: number }>());
export const loadEmployeeContactsSuccess = createAction(
  '[Employees API] Load Employee Contacts Success', props<{ contacts: EmployeeContact[] }>());
export const loadEmployeeContactsFailure = createAction(
  '[Employees API] Load Employee Contacts Failure', props<{ error: HttpErrorResponse }>());

export const clearSelectedEmployee = createAction('[Employee Form] Clear Selected');

export const addEmployee = createAction(
  '[Employee Form] Add Employee',
  props<{ req: CreateEmployeeRequest; contacts: EmployeeContactInput[] }>());
// Crea primero el usuario interno (POST /user/internal con roles+secciones) y luego, con su
// id, delega en addEmployee. Comparte addEmployeeSuccess/Failure.
export const createEmployeeWithUser = createAction(
  '[Employee Form] Create Employee With New User',
  props<{ userPayload: CrearUsuarioPayload; req: CreateEmployeeRequest; contacts: EmployeeContactInput[] }>());
export const addEmployeeSuccess = createAction(
  '[Employees API] Add Employee Success', props<{ employee: Employee }>());
export const addEmployeeFailure = createAction(
  '[Employees API] Add Employee Failure', props<{ error: HttpErrorResponse }>());

export const updateEmployee = createAction(
  '[Employee Form] Update Employee',
  props<{
    id: number;
    req: UpdateEmployeeRequest;
    toCreate: EmployeeContactInput[];
    toUpdate: { contactId: number; input: EmployeeContactInput }[];
    toDelete: number[];
  }>());
export const updateEmployeeSuccess = createAction(
  '[Employees API] Update Employee Success', props<{ employee: Employee }>());
export const updateEmployeeFailure = createAction(
  '[Employees API] Update Employee Failure', props<{ error: HttpErrorResponse }>());

export const toggleEmployeeStatus = createAction(
  '[Employee Row] Toggle Employee Status', props<{ id: number }>());
export const toggleEmployeeStatusSuccess = createAction(
  '[Employees API] Toggle Employee Status Success', props<{ employee: Employee }>());
export const toggleEmployeeStatusFailure = createAction(
  '[Employees API] Toggle Employee Status Failure', props<{ error: HttpErrorResponse }>());
