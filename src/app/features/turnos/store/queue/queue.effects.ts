import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { QueueService } from '../../services/queue.service';
import * as A from './queue.actions';

@Injectable()
export class QueueEffects {
  private actions$ = inject(Actions);
  private service = inject(QueueService);
  private toast = inject(MessageService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadQueue),
    switchMap(({ branchId }) => this.service.list(branchId).pipe(
      map(entries => A.loadQueueSuccess({ entries })),
      catchError(error => of(A.loadQueueFailure({ error }))),
    )),
  ));

  call$ = createEffect(() => this.actions$.pipe(
    ofType(A.callQueueEntry),
    switchMap(({ id, branchId }) => this.service.call(id).pipe(
      tap(() => this.toast.add({ severity: 'success', summary: 'Llamado registrado' })),
      switchMap(() => of(
        A.callQueueEntrySuccess({ id, branchId }),
        A.loadQueue({ branchId }),  // refresh
      )),
      catchError(error => {
        const msg = error?.status === 409
          ? 'El turno ya fue completado o cancelado'
          : 'No se pudo registrar la llamada';
        this.toast.add({ severity: 'error', summary: msg });
        return of(A.callQueueEntryFailure({ error }));
      }),
    )),
  ));
}
