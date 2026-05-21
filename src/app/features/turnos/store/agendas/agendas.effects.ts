import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MessageService } from 'primeng/api';
import { catchError, map, mergeMap, of, switchMap } from 'rxjs';
import { AgendaConfigService } from '../../services/agenda-config.service';
import * as A from './agendas.actions';

@Injectable()
export class AgendasEffects {
  private actions$ = inject(Actions);
  private service = inject(AgendaConfigService);
  private messages = inject(MessageService);

  loadAgendas$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadAgendas),
      switchMap(({ branchId }) =>
        this.service.list(branchId).pipe(
          map((configs) => A.loadAgendasSuccess({ branchId, configs })),
          catchError((error) => of(A.loadAgendasFailure({ branchId, error })))
        )
      )
    )
  );

  createAgenda$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.createAgenda),
      mergeMap(({ request }) =>
        this.service.create(request).pipe(
          map((id) => A.createAgendaSuccess({ branchId: request.branchId, id })),
          catchError((error) => of(A.createAgendaFailure({ error })))
        )
      )
    )
  );

  createAgendaSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.createAgendaSuccess),
      map(({ branchId }) => {
        this.messages.add({ severity: 'success', summary: 'Agenda creada', detail: 'La nueva agenda quedó activa.' });
        return A.loadAgendas({ branchId });
      })
    )
  );

  updateAgenda$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.updateAgenda),
      mergeMap(({ id, branchId, request }) =>
        this.service.update(id, request).pipe(
          map(() => A.updateAgendaSuccess({ id, branchId })),
          catchError((error) => of(A.updateAgendaFailure({ error })))
        )
      )
    )
  );

  updateAgendaSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.updateAgendaSuccess),
      map(({ branchId }) => {
        this.messages.add({ severity: 'success', summary: 'Agenda actualizada', detail: 'Los cambios se guardaron correctamente.' });
        return A.loadAgendas({ branchId });
      })
    )
  );

  deleteAgenda$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.deleteAgenda),
      mergeMap(({ id, branchId }) =>
        this.service.delete(id).pipe(
          map(() => A.deleteAgendaSuccess({ id, branchId })),
          catchError((error) => of(A.deleteAgendaFailure({ error })))
        )
      )
    )
  );

  deleteAgendaSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(A.deleteAgendaSuccess),
        map(() => this.messages.add({ severity: 'success', summary: 'Agenda eliminada' }))
      ),
    { dispatch: false }
  );
}
