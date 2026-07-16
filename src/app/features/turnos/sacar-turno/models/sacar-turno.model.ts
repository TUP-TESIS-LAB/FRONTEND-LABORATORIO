// Modelos del flujo "sacar turno" (lado laboratorio / secretaria).
// El backend ya autoriza a SECRETARIA/RESPONSABLE_SECRETARIA/ADMINISTRADOR en
// los endpoints de catálogo, disponibilidad y creación de turnos.

/** Catálogo: GET /api/v1/turnos/catalog/tipos-analisis (TipoAnalisisResponse). */
export interface TipoAnalisis {
  id: number;
  nombre: string;
  descripcionCorta: string;
  categoria: string;
  ayuno: boolean;
  icono: string;
  preparacion: string[];
  determinationIds: number[];
}

/** Slot disponible ya normalizado para la UI (derivado de AvailableSlotResponse). */
export interface SlotDisponible {
  hora: string;        // "08:30"
  disponible: boolean;
}

/** Payload de POST /api/v1/turnos/appointments (idéntico al del portal). */
export interface BookAppointmentRequest {
  patientId: number;
  branchId: number;
  scheduledAt: string; // hora local sin TZ: "YYYY-MM-DDTHH:mm:ss"
  determinations: Array<{ determinationId: number; orderNumber: number }>;
  comments?: string | null;
}
