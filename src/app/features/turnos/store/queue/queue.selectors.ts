import { createFeatureSelector, createSelector } from '@ngrx/store';
import { isSameLocalDay } from '@shared/utils/same-local-day';
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

/**
 * Cola de espera del DÍA ACTUAL: la sala de espera no debe mostrar gente de días
 * previos. Filtra los PENDING por `createdAt` de hoy (hora local). Defensivo: si un
 * entry no trae `createdAt` lo conservamos (un PENDING sin fecha sigue siendo alguien
 * esperando ahora; preferimos mostrarlo a esconderlo).
 */
export const selectQueueEntriesToday = createSelector(
  selectQueueEntriesAll,
  (entries) => {
    const now = new Date();
    return entries.filter(e => !e.createdAt || isSameLocalDay(e.createdAt, now));
  },
);
