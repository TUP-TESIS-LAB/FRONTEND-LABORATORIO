export type HomeVisitStatus =
  | 'PROGRAMADA'
  | 'EXTRAIDA'
  | 'EN_TRANSITO'
  | 'RECEPCIONADA'
  | 'NO_REALIZADA'
  | 'REPROGRAMADA';

export type HomeVisitOutcomeReason =
  | 'PACIENTE_AUSENTE'
  | 'NO_SE_PUDO_EXTRAER'
  | 'RECHAZO_PACIENTE';

export interface HomeVisit {
  id: number;
  appointmentId: number;
  patientId: number;
  branchId: number;
  assignedExtractorId: number | null;
  addressStreet: string;
  addressNumber: string | null;
  addressCity: string;
  addressReferences: string | null;
  timeWindowStart: string; // 'HH:mm:ss'
  timeWindowEnd: string;
  status: HomeVisitStatus;
  scheduledAt: string | null;    // ISO LocalDateTime
  patientName: string | null;
  patientDni: string | null;
  extractorName: string | null;
}

export interface CreateHomeVisitPayload {
  patientId: number;
  branchId: number;
  scheduledAt: string; // ISO LocalDateTime
  addressStreet: string;
  addressNumber?: string | null;
  addressCity: string;
  addressReferences?: string | null;
  timeWindowStart: string; // 'HH:mm:ss'
  timeWindowEnd: string;
  assignedExtractorId?: number | null;
  comments?: string | null;
  prescriptionFileUrl?: string | null;
  determinations?: { determinationId: number; orderNumber: number }[];
}
