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
          ? 'La atención ya fue completada o cancelada'
          : 'No se pudo registrar la llamada';
        this.toast.add({ severity: 'error', summary: msg });
        return of(A.callQueueEntryFailure({ error }));
      }),
    )),
  ));

  callAppointmentForAttention$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttention),
    switchMap(({ appointmentId, dni, queueEntryId }) =>
      // attendByAppointment: registra el call + transiciona queue_entry
      // a COMPLETED para que salga de la cola inmediatamente.
      // El response.id es el queueEntryId real (creado o recuperado por el BE).
      this.service.attendByAppointment(appointmentId).pipe(
        map(response => A.callAppointmentForAttentionSuccess({
          appointmentId,
          dni,
          // Si ya teníamos el id del totem, usarlo; si no, tomar el que devuelve el BE.
          queueEntryId: queueEntryId ?? response.id,
        })),
        catchError(error => of(A.callAppointmentForAttentionFailure({ error }))),
      )
    ),
  ));

  // Tras Atender exitoso, refrescar la cola silently para que el entry
  // recien COMPLETED desaparezca de la lista sin esperar el polling.
  refreshAfterAttend$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttentionSuccess),
    map(() => A.loadQueue({ silent: true })),
  ));

  navigateAfterCall$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttentionSuccess),
    tap(({ dni, queueEntryId }) => {
      const queryParams: Record<string, string | number> = {};
      if (queueEntryId != null) queryParams['queueEntryId'] = queueEntryId;
      if (dni) queryParams['dni'] = dni;
      this.router.navigate(['/analitica/atencion/nueva'], { queryParams });
    }),
  ), { dispatch: false });

  showErrorToast$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttentionFailure),
    tap(() => this.toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo iniciar la atención. Intentá de nuevo.',
    })),
  ), { dispatch: false });

  cancel$ = createEffect(() => this.actions$.pipe(
    ofType(A.cancelQueueEntry),
    switchMap(({ id }) => this.service.cancel(id).pipe(
      tap(() => this.toast.add({ severity: 'success', summary: 'Atención cancelada' })),
      switchMap(() => of(
        A.cancelQueueEntrySuccess({ id }),
        A.loadQueue({ silent: true }),
      )),
      catchError(error => {
        const msg = error?.status === 409
          ? 'La atención ya fue completada o cancelada'
          : 'No se pudo cancelar la atención';
        this.toast.add({ severity: 'error', summary: msg });
        return of(A.cancelQueueEntryFailure({ error }));
      }),
    )),
  ));

  // "Atender" NO completa la entry (KAN-249). La atención recién se crea en el paso 1 del wizard:
  // si completáramos acá, entre el click y ese guardado el turno no estaría ni en la cola
  // (COMPLETED) ni tendría atención que retomar — un back, un F5 o un click errado lo destruían.
  // La entry queda PENDING (sigue en la cola, sigue retomable) y el backend la completa en la
  // misma transacción en la que crea la atención. Consecuencia aceptada: mientras se carga el
  // paso 1 el turno sigue visible y otra secretaria podría tomarlo — esa carrera es recuperable,
  // perder el turno no lo era.
  attendWalkin$ = createEffect(() => this.actions$.pipe(
    ofType(A.attendWalkinEntry),
    map(({ entryId, dni }) => A.attendWalkinEntrySuccess({ dni, queueEntryId: entryId })),
  ));

  navigateAfterAttendWalkin$ = createEffect(() => this.actions$.pipe(
    ofType(A.attendWalkinEntrySuccess),
    tap(({ dni, queueEntryId }) => {
      const queryParams: Record<string, string | number> = { queueEntryId };
      if (dni) queryParams['dni'] = dni;
      this.router.navigate(['/analitica/atencion/nueva'], { queryParams });
    }),
  ), { dispatch: false });
}
