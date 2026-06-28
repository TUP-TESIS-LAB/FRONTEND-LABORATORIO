import { createReducer, on } from '@ngrx/store';
import { AttentionResponse } from '../../models/atencion.model';
import {
  loadUrgentPending,
  loadUrgentPendingFailure,
  loadUrgentPendingNotModified,
  loadUrgentPendingSuccess,
  resolveAuth,
  resolveAuthFailure,
  resolveAuthSuccess,
  resolveCobro,
  resolveCobroFailure,
  resolveCobroSuccess,
  resolveDatos,
  resolveDatosFailure,
  resolveDatosSuccess,
} from './urgent-pending.actions';
import { initialUrgentPendingState, UrgentPendingState } from './urgent-pending.state';

export const urgentPendingReducer = createReducer(
  initialUrgentPendingState,

  on(loadUrgentPending, (s): UrgentPendingState => ({ ...s, loading: true, error: null })),

  on(loadUrgentPendingSuccess, (s, { items }): UrgentPendingState => ({
    ...s,
    loading: false,
    items,
  })),

  on(loadUrgentPendingNotModified, (s): UrgentPendingState => ({ ...s, loading: false })),

  on(loadUrgentPendingFailure, (s, { error }): UrgentPendingState => ({
    ...s,
    loading: false,
    error,
  })),

  // Resolve auth
  on(resolveAuth, (s): UrgentPendingState => ({ ...s, resolving: true, resolveError: null })),
  on(resolveAuthSuccess, (s, { item }): UrgentPendingState => ({
    ...s,
    resolving: false,
    items: replaceOrRemove(s.items, item),
  })),
  on(resolveAuthFailure, (s, { error }): UrgentPendingState => ({
    ...s,
    resolving: false,
    resolveError: error,
  })),

  // Resolve datos administrativos
  on(resolveDatos, (s): UrgentPendingState => ({ ...s, resolving: true, resolveError: null })),
  on(resolveDatosSuccess, (s, { item }): UrgentPendingState => ({
    ...s,
    resolving: false,
    items: replaceOrRemove(s.items, item),
  })),
  on(resolveDatosFailure, (s, { error }): UrgentPendingState => ({
    ...s,
    resolving: false,
    resolveError: error,
  })),

  // Resolve cobro
  on(resolveCobro, (s): UrgentPendingState => ({ ...s, resolving: true, resolveError: null })),
  on(resolveCobroSuccess, (s, { item }): UrgentPendingState => ({
    ...s,
    resolving: false,
    items: replaceOrRemove(s.items, item),
  })),
  on(resolveCobroFailure, (s, { error }): UrgentPendingState => ({
    ...s,
    resolving: false,
    resolveError: error,
  })),
);

/**
 * Reemplaza la fila por `item` si aún tiene algún pendiente; si ya no tiene
 * ninguno (cobroPendiente, autorizacionPendiente, datosAdministrativosIncompletos
 * todos falsy) la quita de la bandeja.
 */
function replaceOrRemove(items: AttentionResponse[], item: AttentionResponse): AttentionResponse[] {
  // Solo elimina la fila cuando los 3 flags son EXPLÍCITAMENTE false.
  // Si alguno es undefined (el BE no lo incluyó), mantenemos la fila por seguridad.
  const hasPending =
    item.cobroPendiente !== false ||
    item.autorizacionPendiente !== false ||
    item.datosAdministrativosIncompletos !== false;

  if (!hasPending) {
    return items.filter(x => x.id !== item.id);
  }

  const idx = items.findIndex(x => x.id === item.id);
  if (idx === -1) return [item, ...items];
  const next = items.slice();
  next[idx] = item;
  return next;
}
