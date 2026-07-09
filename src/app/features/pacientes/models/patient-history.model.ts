// Historial de atenciones de un paciente (GET /api/v1/attentions/patient/{id}/history).

export type DeliveryStatus = 'DELIVERED' | 'IN_PROCESS' | 'PENDING' | 'CANCELED';

export interface PatientHistoryAnalysis {
  analysisId: number;
  analysisName: string | null;
  /** Precio cobrado (snapshot). null en atenciones previas al feature. */
  chargedPrice: number | null;
  deliveryStatus: DeliveryStatus | null;
}

export interface PatientHistoryItem {
  attentionId: number;
  attentionNumber: string;
  createdAt: string | null;
  attentionState: string | null;
  protocolId: number | null;
  insurancePlanId: number | null;
  analysisCount: number;
  /** Importe total (snapshot + copago). null si la atención no tiene snapshot. */
  total: number | null;
  copaymentAmount: number | null;
  authorizationNumber: string | null;
  /** true si hay al menos un informe firmado (parcial o final) disponible para imprimir. */
  reportAvailable: boolean;
  lastPrintedAt: string | null;
  lastPrintedBy: string | null;
  analyses: PatientHistoryAnalysis[];
}

/** Etiquetas en español del estado de entrega (regla #4). */
export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  DELIVERED: 'Entregado',
  IN_PROCESS: 'En proceso',
  PENDING: 'Pendiente',
  CANCELED: 'Cancelado',
};

export function deliveryStatusLabel(s: DeliveryStatus | null | undefined): string {
  return s ? DELIVERY_STATUS_LABEL[s] ?? s : '—';
}

/** Severity para el tag del estado de entrega. */
export function deliveryStatusSeverity(s: DeliveryStatus | null | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  switch (s) {
    case 'DELIVERED': return 'success';
    case 'IN_PROCESS': return 'info';
    case 'PENDING': return 'warn';
    case 'CANCELED': return 'danger';
    default: return 'secondary';
  }
}
