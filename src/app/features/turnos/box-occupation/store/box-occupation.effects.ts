import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { BoxOccupationService } from '../services/box-occupation.service';
import * as A from './box-occupation.actions';

@Injectable()
export class BoxOccupationEffects {
  private actions$ = inject(Actions);
  private service = inject(BoxOccupationService);
  private toast = inject(MessageService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadBoxOccupations),
    switchMap(({ branchId, boxType }) => this.service.list(branchId, boxType).pipe(
      map(occupations => A.loadBoxOccupationsSuccess({ occupations })),
      catchError(error => of(A.loadBoxOccupationsFailure({ error: String(error?.message ?? error) }))),
    )),
  ));

  occupy$ = createEffect(() => this.actions$.pipe(
    ofType(A.occupyBox),
    switchMap(({ branchId, input }) => this.service.occupy(branchId, input).pipe(
      switchMap(occupation => of(
        A.occupyBoxSuccess({ occupation }),
        A.loadBoxOccupations({ branchId, boxType: input.boxType }),
      )),
      catchError(error => {
        const msg = error?.status === 409
          ? (error?.error?.message ?? 'Ese box ya fue ocupado, refrescá.')
          : (error?.error?.message ?? 'No se pudo ocupar el box.');
        this.toast.add({ severity: 'error', summary: msg });
        return of(A.occupyBoxFailure({ error: msg }));
      }),
    )),
  ));

  release$ = createEffect(() => this.actions$.pipe(
    ofType(A.releaseBox),
    switchMap(({ branchId, boxType }) => this.service.release(branchId, boxType).pipe(
      switchMap(() => of(
        A.releaseBoxSuccess(),
        A.loadBoxOccupations({ branchId, boxType }),
      )),
      catchError(error => of(A.releaseBoxFailure({ error: String(error?.message ?? error) }))),
    )),
  ));
}
