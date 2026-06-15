import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { EmployeeEffects } from './employee.effects';
import { EmployeeService } from '../services/employee.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadEmployees, loadEmployeesSuccess,
  addEmployee, addEmployeeSuccess, addEmployeeFailure,
  updateEmployee, updateEmployeeSuccess, updateEmployeeFailure,
  toggleEmployeeStatus, toggleEmployeeStatusSuccess,
} from './employee.actions';
import { Employee } from '../models/employee.model';

const emp: Employee = { id: 1, firstName: 'a', lastName: 'b', document: '1', isBiochemist: false, registration: null, userId: null, active: true };

describe('EmployeeEffects', () => {
  let actions$: Observable<Action>;
  let svc: Record<string, ReturnType<typeof vi.fn>>;
  const notify = { error: vi.fn(), success: vi.fn() };

  beforeEach(() => {
    svc = {
      list: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), toggleStatus: vi.fn(),
      listContacts: vi.fn(), addContact: vi.fn(), updateContact: vi.fn(), removeContact: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        EmployeeEffects,
        provideMockActions(() => actions$),
        { provide: EmployeeService, useValue: svc },
        { provide: NotificationService, useValue: notify },
      ],
    });
  });

  it('loadEmployees$ maps to loadEmployeesSuccess', () =>
    new Promise<void>((resolve) => {
      svc['list'].mockReturnValue(of([emp]));
      actions$ = of(loadEmployees());
      TestBed.inject(EmployeeEffects).loadEmployees$.subscribe((a) => {
        expect(a).toEqual(loadEmployeesSuccess({ employees: [emp] }));
        resolve();
      });
    }));

  it('addEmployee$ creates employee then its contacts and emits addEmployeeSuccess', () =>
    new Promise<void>((resolve) => {
      svc['create'].mockReturnValue(of(emp));
      svc['addContact'].mockReturnValue(of({ id: 7, employeeId: 1, contactType: 'EMAIL', value: 'x@x.com' }));
      actions$ = of(addEmployee({
        req: { firstName: 'a', lastName: 'b', document: '1', isBiochemist: false },
        contacts: [{ contactType: 'EMAIL', value: 'x@x.com' }],
      }));
      TestBed.inject(EmployeeEffects).addEmployee$.subscribe((a) => {
        expect(a).toEqual(addEmployeeSuccess({ employee: emp }));
        expect(svc['addContact']).toHaveBeenCalledWith(1, { contactType: 'EMAIL', value: 'x@x.com' });
        resolve();
      });
    }));

  it('addEmployee$ with no contacts still emits success without calling addContact', () =>
    new Promise<void>((resolve) => {
      svc['create'].mockReturnValue(of(emp));
      actions$ = of(addEmployee({ req: { firstName: 'a', lastName: 'b', document: '1', isBiochemist: false }, contacts: [] }));
      TestBed.inject(EmployeeEffects).addEmployee$.subscribe((a) => {
        expect(a).toEqual(addEmployeeSuccess({ employee: emp }));
        expect(svc['addContact']).not.toHaveBeenCalled();
        resolve();
      });
    }));

  it('updateEmployee$ updates then reconciles contacts (delete/update/create) and emits success', () =>
    new Promise<void>((resolve) => {
      svc['update'].mockReturnValue(of(emp));
      svc['removeContact'].mockReturnValue(of(undefined));
      svc['updateContact'].mockReturnValue(of({ id: 2, employeeId: 1, contactType: 'PHONE', value: '11' }));
      svc['addContact'].mockReturnValue(of({ id: 3, employeeId: 1, contactType: 'EMAIL', value: 'n@x.com' }));
      actions$ = of(updateEmployee({
        id: 1,
        req: { firstName: 'a', lastName: 'b', document: '1', isBiochemist: true },
        toCreate: [{ contactType: 'EMAIL', value: 'n@x.com' }],
        toUpdate: [{ contactId: 2, input: { contactType: 'PHONE', value: '11' } }],
        toDelete: [9],
      }));
      TestBed.inject(EmployeeEffects).updateEmployee$.subscribe((a) => {
        expect(a).toEqual(updateEmployeeSuccess({ employee: emp }));
        expect(svc['removeContact']).toHaveBeenCalledWith(1, 9);
        expect(svc['updateContact']).toHaveBeenCalledWith(1, 2, { contactType: 'PHONE', value: '11' });
        expect(svc['addContact']).toHaveBeenCalledWith(1, { contactType: 'EMAIL', value: 'n@x.com' });
        resolve();
      });
    }));

  it('notifyEmployeeSaveError$ shows a toast on addEmployeeFailure (status 500)', () =>
    new Promise<void>((resolve) => {
      notify.error.mockClear();
      const error = new HttpErrorResponse({ status: 500 });
      actions$ = of(addEmployeeFailure({ error }));
      TestBed.inject(EmployeeEffects).notifyEmployeeSaveError$.subscribe(() => {
        expect(notify.error).toHaveBeenCalledWith('No se pudo guardar el empleado. Intentá de nuevo en unos minutos.');
        resolve();
      });
    }));

  it('notifyEmployeeSaveError$ shows a toast on updateEmployeeFailure (status 409)', () =>
    new Promise<void>((resolve) => {
      notify.error.mockClear();
      const error = new HttpErrorResponse({ status: 409 });
      actions$ = of(updateEmployeeFailure({ error }));
      TestBed.inject(EmployeeEffects).notifyEmployeeSaveError$.subscribe(() => {
        expect(notify.error).toHaveBeenCalledWith('Ya existe un empleado con ese documento.');
        resolve();
      });
    }));

  it('toggleEmployeeStatus$ maps to success with returned employee', () =>
    new Promise<void>((resolve) => {
      svc['toggleStatus'].mockReturnValue(of({ ...emp, active: false }));
      actions$ = of(toggleEmployeeStatus({ id: 1 }));
      TestBed.inject(EmployeeEffects).toggleEmployeeStatus$.subscribe((a) => {
        expect(a).toEqual(toggleEmployeeStatusSuccess({ employee: { ...emp, active: false } }));
        resolve();
      });
    }));
});
