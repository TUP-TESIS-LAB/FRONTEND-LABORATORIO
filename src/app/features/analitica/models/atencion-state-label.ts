import { AttentionState } from './atencion.model';

/**
 * Etiquetas en español para los estados del state machine.
 *
 * Regla del proyecto: NUNCA mostrar el enum `AttentionState` directamente en UI —
 * los valores del enum vienen del backend en inglés y nuestro frontend está en
 * español. Cualquier render de un estado (tag, columna, header del wizard, KPI,
 * filtro) debe pasar por `attentionStateLabel(...)` o esta tabla.
 */
export const ATTENTION_STATE_LABELS: Record<AttentionState, string> = {
  [AttentionState.REGISTERING_GENERAL_DATA]: 'Datos generales',
  [AttentionState.REGISTERING_ANALYSES]:     'Análisis',
  [AttentionState.ON_COLLECTION_PROCESS]:    'Cobro',
  [AttentionState.ON_BILLING_PROCESS]:       'Facturación',
  [AttentionState.AWAITING_CONFIRMATION]:    'Esperando confirmación',
  [AttentionState.AWAITING_EXTRACTION]:      'Esperando extracción',
  [AttentionState.IN_EXTRACTION]:            'En extracción',
  [AttentionState.FINISHED]:                 'Finalizada',
  [AttentionState.CANCELED]:                 'Cancelada',
  [AttentionState.FAILED]:                   'Fallida',
};

export function attentionStateLabel(state: AttentionState | null | undefined): string {
  if (!state) return '—';
  return ATTENTION_STATE_LABELS[state] ?? state;
}

export type StateTagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

export function attentionStateSeverity(state: AttentionState): StateTagSeverity {
  if (state === AttentionState.FINISHED) return 'success';
  if (state === AttentionState.CANCELED || state === AttentionState.FAILED) return 'danger';
  if (state === AttentionState.AWAITING_EXTRACTION || state === AttentionState.IN_EXTRACTION) return 'info';
  return 'warn';
}
