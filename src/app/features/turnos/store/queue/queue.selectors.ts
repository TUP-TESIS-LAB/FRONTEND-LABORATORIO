import { createFeatureSelector, createSelector } from '@ngrx/store';
import { QueueStatus } from '../../models/queue-status.enum';
import { QueueState } from './queue.state';

export const selectQueueState = createFeatureSelector<QueueState>('queue');

export const selectQueueEntriesWithAppointment = createSelector(
  selectQueueState,
  (s) => s.entries.filter(e => e.status === QueueStatus.PENDING && e.hasAppointment),
);

export const selectQueueEntriesWalkIn = createSelector(
  selectQueueState,
  (s) => s.entries.filter(e => e.status === QueueStatus.PENDING && !e.hasAppointment),
);

export const selectQueueLoading = createSelector(selectQueueState, (s) => s.loading);
export const selectQueueCallingId = createSelector(selectQueueState, (s) => s.callingId);

/**
 * Cola unica combinada (CT + ST) ordenada por orden de llegada (createdAt asc).
 * Reemplaza el patron de 2 listas separadas en la pantalla de Recepcion.
 * El distinguidor CT/ST queda implicito en el prefijo del publicCode.
 *
 * Fallback al id si createdAt no viene del backend (el DTO actual no lo expone,
 * tracking aparte; mientras tanto el id mantiene orden de inserción).
 */
export const selectQueueEntriesAll = createSelector(
  selectQueueState,
  (s) => s.entries
    .filter(e => e.status === QueueStatus.PENDING)
    .slice()  // copia defensiva (no mutar el state)
    .sort((a, b) => {
      const ac = a.createdAt ?? '';
      const bc = b.createdAt ?? '';
      if (ac && bc) return ac.localeCompare(bc);
      return a.id - b.id;
    }),
);
