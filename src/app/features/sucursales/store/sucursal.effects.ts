import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { MessageService } from 'primeng/api';

import * as A from './sucursal.actions';
import { SucursalService } from '../services/sucursal.service';

@Injectable()
export class SucursalEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(SucursalService);
  private readonly messageService = inject(MessageService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadSucursales),
    switchMap(() => this.service.list().pipe(
      map(page => A.loadSucursalesSuccess({ list: page.content })),
      catchError(error => of(A.loadSucursalesFailure({ error })))
    ))
  ));

  add$ = createEffect(() => this.actions$.pipe(
    ofType(A.addSucursal),
    switchMap(({ input }) => this.service.create(input).pipe(
      map(sucursal => A.addSucursalSuccess({ sucursal })),
      catchError(error => of(A.addSucursalFailure({ error })))
    ))
  ));

  update$ = createEffect(() => this.actions$.pipe(
    ofType(A.updateSucursal),
    switchMap(({ id, input }) => this.service.update(id, input).pipe(
      map(sucursal => A.updateSucursalSuccess({ sucursal })),
      catchError(error => of(A.updateSucursalFailure({ error })))
    ))
  ));

  toggle$ = createEffect(() => this.actions$.pipe(
    ofType(A.toggleSucursalStatus),
    switchMap(({ id }) => this.service.toggleStatus(id).pipe(
      map(sucursal => A.toggleSucursalStatusSuccess({ sucursal })),
      catchError(error => of(A.toggleSucursalStatusFailure({ error })))
    ))
  ));

  delete$ = createEffect(() => this.actions$.pipe(
    ofType(A.deleteSucursal),
    switchMap(({ id }) => this.service.delete(id).pipe(
      map(() => A.deleteSucursalSuccess({ id })),
      catchError(error => of(A.deleteSucursalFailure({ error })))
    ))
  ));

  showError$ = createEffect(() => this.actions$.pipe(
    ofType(
      A.loadSucursalesFailure,
      A.addSucursalFailure,
      A.updateSucursalFailure,
      A.toggleSucursalStatusFailure,
      A.deleteSucursalFailure,
    ),
    tap(() => this.messageService.add({
      severity: 'error', summary: 'Error', detail: 'Operación de sucursales falló.',
    }))
  ), { dispatch: false });
}
