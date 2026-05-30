import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, exhaustMap, forkJoin, map, of, switchMap, withLatestFrom } from 'rxjs';
import { ObraSocialService } from '../services/obra-social.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadObrasSociales, loadObrasSocialesSuccess, loadObrasSocialesFailure,
  setObraSocialPageRequest,
  loadObraSocial, loadObraSocialSuccess, loadObraSocialFailure,
  createObraSocial, createObraSocialSuccess, createObraSocialFailure,
  loadObraSocialCatalogs, loadObraSocialCatalogsSuccess, loadObraSocialCatalogsFailure,
} from './obra-social.actions';
import { selectObraSocialPageRequest } from './obra-social.selectors';

@Injectable()
export class ObraSocialEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(ObraSocialService);
  private readonly store = inject(Store);
  private readonly notifications = inject(NotificationService);

  loadObrasSociales$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadObrasSociales),
      switchMap(({ req }) =>
        this.service.search(req).pipe(
          map((result) => loadObrasSocialesSuccess({ result })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudieron cargar las obras sociales.');
            return of(loadObrasSocialesFailure({ error }));
          }),
        ),
      ),
    ),
  );

  /** Al cambiar filtros/página, refetch con el page request mergeado del store. */
  setPageRequestPropagation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setObraSocialPageRequest),
      withLatestFrom(this.store.select(selectObraSocialPageRequest)),
      map(([, req]) => loadObrasSociales({ req })),
    ),
  );

  loadObraSocial$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadObraSocial),
      switchMap(({ id }) =>
        this.service.getCompleteById(id).pipe(
          map((insurer) => loadObraSocialSuccess({ insurer })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se encontró la obra social.');
            return of(loadObraSocialFailure({ error }));
          }),
        ),
      ),
    ),
  );

  createObraSocial$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createObraSocial),
      exhaustMap(({ payload }) =>
        this.service.createFromWizard(payload).pipe(
          map((insurer) => {
            this.notifications.success('La obra social se creó correctamente.');
            return createObraSocialSuccess({ insurer });
          }),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo crear la obra social.');
            return of(createObraSocialFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadObraSocialCatalogs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadObraSocialCatalogs),
      exhaustMap(() =>
        forkJoin({
          insurerTypes: this.service.getInsurerTypes(),
          nbuVersions: this.service.getNbuVersions(),
          contactTypes: this.service.getContactTypes(),
        }).pipe(
          map(({ insurerTypes, nbuVersions, contactTypes }) =>
            loadObraSocialCatalogsSuccess({ insurerTypes, nbuVersions, contactTypes }),
          ),
          catchError((error: HttpErrorResponse) => of(loadObraSocialCatalogsFailure({ error }))),
        ),
      ),
    ),
  );
}
