import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { QueueService } from '../../services/queue.service';
import { OperatorBranchContextService } from '../../services/operator-branch.context';
import * as A from './queue.actions';

@Injectable()
export class QueueEffects {
  private actions$ = inject(Actions);
  private service = inject(QueueService);
  private toast = inject(MessageService);
  private router = inject(Router);
  private branchContext = inject(OperatorBranchContextService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadQueue),
    switchMap(({ branchId }) => {
      const effectiveBranchId = branchId ?? this.branchContext.branchId();
      if (effectiveBranchId == null) {
        console.warn('[queue.effects] loadQueue dispatched sin branchId y sin context — skip');
        return of(A.loadQueueFailure({ error: new Error('No branchId available') }));
      }
      return this.service.list(effectiveBranchId).pipe(
        map(entries => A.loadQueueSuccess({ entries })),
        catchError(error => of(A.loadQueueFailure({ error }))),
      );
    }),
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

  callAppointmentForAttention$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttention),
    switchMap(({ appointmentId }) =>
      this.service.callByAppointment(appointmentId).pipe(
        map(() => A.callAppointmentForAttentionSuccess({ appointmentId })),
        catchError(error => of(A.callAppointmentForAttentionFailure({ error }))),
      )
    ),
  ));

  navigateAfterCall$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttentionSuccess),
    tap(({ appointmentId }) =>
      this.router.navigate(['/turnos/atencion-turno'], { queryParams: { appointmentId } })
    ),
  ), { dispatch: false });

  showErrorToast$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttentionFailure),
    tap(() => this.toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo llamar el turno. Intentá de nuevo.',
    })),
  ), { dispatch: false });
}
