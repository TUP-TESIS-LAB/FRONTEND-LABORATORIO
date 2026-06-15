import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, switchMap, timeout } from 'rxjs';
import { AccessApiService } from '../access-api.service';
import { loadMySections, loadMySectionsSuccess, loadMySectionsFailure } from './access.actions';

/** Tope para que una request colgada (proxy sin responder / BE caído) no deje
 *  `loaded` en false para siempre: al vencer, cae por catchError a *Failure,
 *  que sí marca loaded=true y desbloquea el landing guard. */
const MY_SECTIONS_TIMEOUT_MS = 15_000;

@Injectable()
export class AccessEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(AccessApiService);

  loadMySections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMySections),
      switchMap(() =>
        this.api.getMySections().pipe(
          timeout({ first: MY_SECTIONS_TIMEOUT_MS }),
          map((sections) => loadMySectionsSuccess({ sections: sections.map((s) => s.code) })),
          catchError((error: HttpErrorResponse) => of(loadMySectionsFailure({ error }))),
        ),
      ),
    ),
  );
}
