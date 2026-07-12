import { MetricBreakdown } from '../models/metric-envelopes.model';

/**
 * Traduce claves crudas de enums del backend (`AnalysisSubStatus`, `StudyStatus`) a
 * español legible. El backend serializa `MetricBreakdown.Slice.label` como
 * `enum.name()` sin traducir (confirmado en `GetSubEstadosAnaliticosUseCase` /
 * `GetEstudiosPorEstadoUseCase`, sin mapper de por medio) — la traducción es
 * responsabilidad de la capa de presentación (Regla #4 de CLAUDE.md: nada en inglés
 * en la UI final).
 */
const METRIC_LABELS: Record<string, string> = {
  // AnalysisSubStatus (sub-estados analíticos en vivo, tab Volumen)
  READY_TO_SAMPLE_COLLECTION: 'Listo para toma de muestra',
  SAMPLE_PREPARED: 'Muestra preparada',
  SAMPLE_CHECKED_IN: 'Muestra recibida',
  MANUAL_MEASUREMENT_IN_PROGRESS: 'Medición manual en curso',
  AUTOMATED_MEASUREMENT_IN_PROGRESS: 'Medición automática en curso',
  LOADED_RESULTS: 'Resultados cargados',
  MEASUREMENT_MANUAL_REVIEW: 'Revisión manual',
  MEASUREMENT_AUTOMATED_REVIEW: 'Revisión automática',
  MEASUREMENT_TECHNICAL_REVIEW: 'Revisión técnica',
  RESULTS_VALIDATED: 'Resultados validados',
  RESULTS_DELIVERED: 'Resultados entregados',
  CANCELED: 'Cancelado',

  // StudyStatus (estudios por estado, tab Postanalítica)
  PENDING: 'Pendiente',
  PARTIALLY_SIGNED: 'Firmado parcialmente',
  READY_FOR_SIGNATURE: 'Listo para firmar',
  CLOSED: 'Cerrado',

  // Gender (demografía por género, tab Volumen) — mismo texto que
  // `pacientes/models/patient-labels.ts` (`GENDER_LABEL`), única fuente de verdad del
  // enum de paciente; se duplica acá en vez de importarlo porque ese helper devuelve '—'
  // para valores no mapeados, mientras que este traductor genérico de breakdowns necesita
  // el fallback humanizado (ver `translateMetricLabel`).
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  OTHER: 'Otro',
  NOT_SPECIFIED: 'No especificado',

  // PaymentMethod (recaudación/conciliación por método, dashboard financiero) — mismo
  // texto que `METHOD_META` en financiero.model.ts (única fuente de verdad de esos
  // labels); se duplica acá por la misma razón que Gender más arriba: ese mapa no cubre
  // el caso genérico de un breakdown con clave no mapeada.
  CASH: 'Efectivo',
  QR: 'QR',
  POSNET: 'Posnet',
  TRANSFER: 'Transferencia',
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',

  // TreasuryEntrySource (tesorería por origen, dashboard financiero)
  BRANCH_RENDICION: 'Rendición de sucursal',
  BRANCH_CASH_CLOSE: 'Cierre de caja',
  DIGITAL_PAYMENT: 'Pago digital',
  DIGITAL_BATCH: 'Lote digital',
  OBRA_SOCIAL_SETTLEMENT: 'Liquidación de obra social',
  EXPENSE: 'Egreso',
  MANUAL: 'Movimiento manual',
};

/**
 * `SOME_UNKNOWN_TOKEN` → `"Some unknown token"`. Fallback para valores no
 * mapeados (ej. un estado nuevo agregado en el backend) — nunca se muestra un
 * `SCREAMING_SNAKE_CASE` crudo en la UI.
 */
function humanize(raw: string): string {
  const words = raw.toLowerCase().split('_').filter(Boolean);
  if (words.length === 0) return raw;
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '');
}

/** Traduce una clave cruda de métrica (key/label de un `MetricSlice`) a español legible. */
export function translateMetricLabel(raw: string): string {
  if (!raw) return raw;
  return METRIC_LABELS[raw] ?? humanize(raw);
}

/**
 * Fábrica de un traductor de `MetricBreakdown` memoizado por referencia de entrada.
 *
 * Si se llama a `translateMetricLabel` de nuevo en cada evaluación de un `computed()`,
 * el `.map()` arma un array/objetos NUEVOS aunque el `breakdown` de entrada no haya
 * cambiado — como el polling vuelve a disparar el `computed()` en cada tick (el slice de
 * NgRx recrea el objeto contenedor incluso cuando el campo puntual quedó igual por 304),
 * eso hacía que el gráfico se re-renderizara/animara de nuevo aunque el dato fuera
 * idéntico (KAN-220). Esta fábrica cachea el último `(entrada, salida)` y devuelve la
 * MISMA referencia de salida si la entrada no cambió, para que el `computed()` que la
 * consume tampoco cambie de valor y no dispare un re-render corriente abajo.
 */
export function createBreakdownTranslator(): (breakdown: MetricBreakdown | null | undefined) => MetricBreakdown | undefined {
  let lastInput: MetricBreakdown | null | undefined;
  let lastOutput: MetricBreakdown | undefined;
  return (breakdown) => {
    if (breakdown === lastInput) return lastOutput;
    lastInput = breakdown;
    lastOutput = breakdown
      ? { ...breakdown, slices: breakdown.slices.map(slice => ({ ...slice, label: translateMetricLabel(slice.label) })) }
      : undefined;
    return lastOutput;
  };
}
