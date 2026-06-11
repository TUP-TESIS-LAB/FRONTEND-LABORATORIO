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

// ── Grupos de estado para el LISTADO ────────────────────────────────────────
//
// El wizard sigue mostrando el estado fino (`attentionStateLabel`), pero el listado
// de Recepción agrupa varios estados en una sola etiqueta visible: todas las fases
// previas a la extracción se ven como "En espera". Esto evita exponer el detalle del
// state machine a la recepción y simplifica el filtro (una opción "En espera" cubre
// todos sus estados subyacentes).

/** Etiquetas de grupo (lo que ve el usuario en la columna Estado del listado). */
export type AttentionGroupLabel =
  | 'En espera'
  | 'Esperando extracción'
  | 'En extracción'
  | 'Finalizada'
  | 'Cancelada'
  | 'Fallida';

/** Estados que se colapsan bajo "En espera" en el listado. */
const WAITING_STATES: readonly AttentionState[] = [
  AttentionState.REGISTERING_GENERAL_DATA,
  AttentionState.REGISTERING_ANALYSES,
  AttentionState.AWAITING_CONFIRMATION,
  AttentionState.ON_COLLECTION_PROCESS,
  AttentionState.ON_BILLING_PROCESS,
];

/** Mapa estado → etiqueta de grupo visible en el listado. */
const ATTENTION_GROUP_BY_STATE: Record<AttentionState, AttentionGroupLabel> = {
  [AttentionState.REGISTERING_GENERAL_DATA]: 'En espera',
  [AttentionState.REGISTERING_ANALYSES]:     'En espera',
  [AttentionState.AWAITING_CONFIRMATION]:    'En espera',
  [AttentionState.ON_COLLECTION_PROCESS]:    'En espera',
  [AttentionState.ON_BILLING_PROCESS]:       'En espera',
  [AttentionState.AWAITING_EXTRACTION]:      'Esperando extracción',
  [AttentionState.IN_EXTRACTION]:            'En extracción',
  [AttentionState.FINISHED]:                 'Finalizada',
  [AttentionState.CANCELED]:                 'Cancelada',
  [AttentionState.FAILED]:                   'Fallida',
};

/** Etiqueta de grupo para mostrar en el listado. */
export function attentionGroupLabel(state: AttentionState | null | undefined): string {
  if (!state) return '—';
  return ATTENTION_GROUP_BY_STATE[state] ?? state;
}

/** Severidad del tag para la etiqueta de grupo del listado. */
export function attentionGroupSeverity(state: AttentionState | null | undefined): StateTagSeverity {
  if (!state) return 'secondary';
  const group = ATTENTION_GROUP_BY_STATE[state];
  switch (group) {
    case 'Finalizada':            return 'success';
    case 'Cancelada':
    case 'Fallida':              return 'danger';
    case 'Esperando extracción':
    case 'En extracción':         return 'info';
    case 'En espera':             return 'warn';
    default:                      return 'secondary';
  }
}

export interface AttentionStateGroup {
  label: AttentionGroupLabel;
  severity: StateTagSeverity;
  states: AttentionState[];
}

/**
 * Grupos de estado que el FILTRO del listado ofrece como opciones únicas. Seleccionar
 * "En espera" filtra por todos sus estados subyacentes.
 *
 * Módulo FINANCIERO: si está apagado, los estados de cobro/facturación NO se incluyen
 * en el grupo "En espera" (igual el tenant nunca los alcanza, pero así el set queda
 * limpio para el filtro). Por eso es una FUNCIÓN parametrizada por `financieroActive`.
 */
export function buildAttentionStateGroups(financieroActive: boolean): AttentionStateGroup[] {
  const waiting = WAITING_STATES.filter(
    s => financieroActive || (s !== AttentionState.ON_COLLECTION_PROCESS && s !== AttentionState.ON_BILLING_PROCESS),
  );
  return [
    { label: 'En espera',            severity: 'warn',    states: waiting },
    { label: 'Esperando extracción', severity: 'info',    states: [AttentionState.AWAITING_EXTRACTION] },
    { label: 'En extracción',        severity: 'info',    states: [AttentionState.IN_EXTRACTION] },
    { label: 'Finalizada',           severity: 'success', states: [AttentionState.FINISHED] },
    { label: 'Cancelada',            severity: 'danger',  states: [AttentionState.CANCELED] },
    { label: 'Fallida',              severity: 'danger',  states: [AttentionState.FAILED] },
  ];
}

/**
 * Grupos por defecto (FINANCIERO activo: incluye cobro/facturación dentro de "En espera").
 * Para respetar la config del tenant en el filtro, usar `buildAttentionStateGroups(...)`.
 */
export const ATTENTION_STATE_GROUPS: readonly AttentionStateGroup[] = buildAttentionStateGroups(true);
