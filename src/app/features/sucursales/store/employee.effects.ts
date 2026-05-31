import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, concat, concatMap, exhaustMap, last, map, Observable, of, switchMap } from 'rxjs';
import { EmployeeService } from '../services/employee.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadEmployees, loadEmployeesSuccess, loadEmployeesFailure,
  loadEmployee, loadEmployeeSuccess, loadEmployeeFailure,
  loadEmployeeContacts, loadEmployeeContactsSuccess, loadEmployeeContactsFailure,
  addEmployee, addEmployeeSuccess, addEmployeeFailure,
  updateEmployee, updateEmployeeSuccess, updateEmployeeFailure,
  toggleEmployeeStatus, toggleEmployeeStatusSuccess, toggleEmployeeStatusFailure,
} from './employee.actions';

@Injectable()
export class EmployeeEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(EmployeeService);
  private readonly notifications = inject(NotificationService);

  /** Corre operaciones HTTP en serie; emite una vez al terminar todas (o inmediato si no hay). */
  private runOps(ops: Observable<unknown>[]): Observable<unknown> {
    return ops.length ? concat(...ops).pipe(last()) : of(null);
  }

  loadEmployees$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadEmployees),
      switchMap(() =>
        this.service.list().pipe(
          map((employees) => loadEmployeesSuccess({ employees })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudieron cargar los empleados.');
            return of(loadEmployeesFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadEmployee$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadEmployee),
      switchMap(({ id }) =>
        this.service.getById(id).pipe(
          map((employee) => loadEmployeeSuccess({ employee })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo cargar el empleado.');
            return of(loadEmployeeFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadEmployeeContacts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadEmployeeContacts),
      switchMap(({ employeeId }) =>
        this.service.listContacts(employeeId).pipe(
          map((contacts) => loadEmployeeContactsSuccess({ contacts })),
          catchError((error: HttpErrorResponse) => of(loadEmployeeContactsFailure({ error }))),
        ),
      ),
    ),
  );

  addEmployee$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addEmployee),
      exhaustMap(({ req, contacts }) =>
        this.service.create(req).pipe(
          switchMap((employee) =>
            this.runOps(contacts.map((c) => this.service.addContact(employee.id, c))).pipe(
              map(() => addEmployeeSuccess({ employee })),
              catchError(() => {
                this.notifications.error('El empleado se creó, pero algunos contactos no se guardaron.');
                return of(addEmployeeSuccess({ employee }));
              }),
            ),
          ),
          catchError((error: HttpErrorResponse) => of(addEmployeeFailure({ error }))),
        ),
      ),
    ),
  );

  updateEmployee$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateEmployee),
      exhaustMap(({ id, req, toCreate, toUpdate, toDelete }) =>
        this.service.update(id, req).pipe(
          switchMap((employee) => {
            const ops: Observable<unknown>[] = [
              ...toDelete.map((cid) => this.service.removeContact(id, cid)),
              ...toUpdate.map((u) => this.service.updateContact(id, u.contactId, u.input)),
              ...toCreate.map((c) => this.service.addContact(id, c)),
            ];
            return this.runOps(ops).pipe(
              map(() => updateEmployeeSuccess({ employee })),
              catchError(() => {
                this.notifications.error('Los datos se guardaron, pero algunos contactos no.');
                return of(updateEmployeeSuccess({ employee }));
              }),
            );
          }),
          catchError((error: HttpErrorResponse) => of(updateEmployeeFailure({ error }))),
        ),
      ),
    ),
  );

  toggleEmployeeStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(toggleEmployeeStatus),
      concatMap(({ id }) =>
        this.service.toggleStatus(id).pipe(
          map((employee) => toggleEmployeeStatusSuccess({ employee })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo cambiar el estado del empleado.');
            return of(toggleEmployeeStatusFailure({ error }));
          }),
        ),
      ),
    ),
  );
}
