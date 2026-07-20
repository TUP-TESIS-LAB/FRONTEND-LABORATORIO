export interface TotemState {
  submitting: boolean;
  lastQueueNumber: string | null;
  lastHasAppointment: boolean;
  /** Mensaje de error listo para mostrar (ya en español, viene saneado del backend). */
  error: string | null;
}

export const initialTotemState: TotemState = {
  submitting: false,
  lastQueueNumber: null,
  lastHasAppointment: false,
  error: null,
};
