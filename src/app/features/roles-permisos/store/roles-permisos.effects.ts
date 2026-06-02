import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, exhaustMap, map, of, switchMap, withLatestFrom, filter } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { RolesPermisosApiService } from '../services/roles-permisos-api.service';
import {
  loadCatalog, loadCatalogSuccess, loadCatalogFailure,
  selectUser, loadUserSections, loadUserSectionsSuccess, loadUserSectionsFailure,
  saveUserSections, saveUserSectionsSuccess, saveUserSectionsFailure,
} from './roles-permisos.actions';
import { selectSelectedUserId, selectWorkingSet } from './roles-permisos.selectors';

@Injectable()
export class RolesPermisosEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(RolesPermisosApiService);
  private readonly notifications = inject(NotificationService);

  loadCatalog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCatalog),
      switchMap(() =>
        this.api.getGrantable().pipe(
          map((catalog) => loadCatalogSuccess({ catalog })),
          catchError((error: HttpErrorResponse) => of(loadCatalogFailure({ error }))),
        ),
      ),
    ),
  );

  selectUserLoad$ = createEffect(() =>
    this.actions$.pipe(
      ofType(selectUser),
      map(({ userId }) => loadUserSections({ userId })),
    ),
  );

  loadUserSections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUserSections),
      switchMap(({ userId }) =>
        this.api.getUserSections(userId).pipe(
          map((sections) => loadUserSectionsSuccess({ sections: sections.map((s) => s.code) })),
          catchError((error: HttpErrorResponse) => of(loadUserSectionsFailure({ error }))),
        ),
      ),
    ),
  );

  saveUserSections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveUserSections),
      withLatestFrom(this.store.select(selectSelectedUserId), this.store.select(selectWorkingSet)),
      filter(([, userId]) => userId !== null),
      exhaustMap(([, userId, workingSet]) =>
        this.api.setUserSections(userId as number, workingSet).pipe(
          map(() => saveUserSectionsSuccess({ sections: workingSet })),
          catchError((error: HttpErrorResponse) => of(saveUserSectionsFailure({ error }))),
        ),
      ),
    ),
  );

  saveSuccessToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(saveUserSectionsSuccess),
        map(() => this.notifications.success('Accesos actualizados')),
      ),
    { dispatch: false },
  );

  globalFailureToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loadCatalogFailure, loadUserSectionsFailure, saveUserSectionsFailure),
        map(({ error }) => {
          const detail =
            (error?.error as { message?: string })?.message ?? error?.message ?? 'Error inesperado';
          this.notifications.error('Operación fallida', detail);
        }),
      ),
    { dispatch: false },
  );
}
