import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { toValidationListRow } from '../../models/postanalitica.model';
import {
  loadValidacionProtocolos,
  loadValidacionProtocolosSuccess,
  loadValidacionProtocolosFailure,
} from './validacion-protocolos.actions';

@Injectable()
export class ValidacionProtocolosEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(PostanaliticaApiService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadValidacionProtocolos),
      switchMap(() =>
        this.api.listStudies().pipe(
          map(page => loadValidacionProtocolosSuccess({ rows: page.content.map(toValidationListRow) })),
          catchError((error: HttpErrorResponse) => of(loadValidacionProtocolosFailure({ error }))),
        ),
      ),
    ),
  );
}
