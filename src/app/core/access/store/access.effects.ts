import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, switchMap } from 'rxjs';
import { AccessApiService } from '../access-api.service';
import { loadMySections, loadMySectionsSuccess, loadMySectionsFailure } from './access.actions';

@Injectable()
export class AccessEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(AccessApiService);

  loadMySections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMySections),
      switchMap(() =>
        this.api.getMySections().pipe(
          map((sections) => loadMySectionsSuccess({ sections: sections.map((s) => s.code) })),
          catchError((error: HttpErrorResponse) => of(loadMySectionsFailure({ error }))),
        ),
      ),
    ),
  );
}
