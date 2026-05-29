import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { BranchTotemConfigService } from '../../services/branch-totem-config.service';
import * as A from './branch-totem-config.actions';

@Injectable()
export class BranchTotemConfigEffects {
  private actions$ = inject(Actions);
  private service = inject(BranchTotemConfigService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadBranchTotemConfig),
    switchMap(({ branchId }) => this.service.get(branchId).pipe(
      map(config => A.loadBranchTotemConfigSuccess({ branchId, enabled: config.enabled })),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(A.loadBranchTotemConfigSuccess({ branchId, enabled: false }));
        }
        return of(A.loadBranchTotemConfigFailure({ error: err }));
      }),
    )),
  ));
}
