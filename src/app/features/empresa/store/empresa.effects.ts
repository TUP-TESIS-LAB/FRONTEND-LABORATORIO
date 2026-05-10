import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { EmpresaService } from '../services/empresa.service';
import {
  loadUsuarios,
  loadUsuariosSuccess,
  loadUsuariosFailure,
  loadRoles,
  loadRolesSuccess,
  loadRolesFailure,
} from './empresa.actions';

@Injectable()
export class EmpresaEffects {
  private readonly actions$ = inject(Actions);
  private readonly empresaService = inject(EmpresaService);

  loadUsuarios$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsuarios),
      switchMap(() =>
        this.empresaService.getUsuarios().pipe(
          map((usuarios) => loadUsuariosSuccess({ usuarios })),
          catchError((error: HttpErrorResponse) =>
            of(loadUsuariosFailure({ error }))
          )
        )
      )
    )
  );

  loadRoles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadRoles),
      switchMap(() =>
        this.empresaService.getRoles().pipe(
          map((roles) => loadRolesSuccess({ roles })),
          catchError((error: HttpErrorResponse) =>
            of(loadRolesFailure({ error }))
          )
        )
      )
    )
  );
}
