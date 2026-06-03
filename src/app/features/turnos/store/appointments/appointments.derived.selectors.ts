import { createSelector } from '@ngrx/store';
import { selectTodayAppointments } from './appointments.selectors';
import { selectQueueState } from '../queue/queue.selectors';
import { Appointment } from '../../models/appointment.model';

export type DrawerEstado = 'Pendiente' | 'Llego' | 'Cancelado';

export interface DrawerAppointmentRow {
  id: number;
  hora: string;       // HH:MM
  paciente: string;
  estado: DrawerEstado;
}

/**
 * Proyecta los appointments del dia con el estado UI derivado del cruce
 * con la cola actual. Reglas:
 *   - status=CANCELLED -> 'Cancelado'
 *   - existe QueueEntry con appointmentId == apt.id -> 'Llego'
 *   - resto -> 'Pendiente'
 *
 * Orden: hora asc, con cancelados al final (independiente de la hora).
 */
export const selectScheduledAppointmentsForDrawer = createSelector(
  selectTodayAppointments,
  selectQueueState,
  (appointments: Appointment[], queueState): DrawerAppointmentRow[] => {
    const arrivedIds = new Set(
      queueState.entries
        .map(e => e.appointmentId)
        .filter((id): id is number => typeof id === 'number'),
    );

    const rows: DrawerAppointmentRow[] = appointments.map(a => ({
      id: a.id,
      hora: a.appointmentTime.slice(11, 16),  // HH:MM del ISO 2026-06-02T09:00:00Z
      paciente: a.patientName,
      estado: deriveEstado(a, arrivedIds),
    }));

    return rows.sort((a, b) => {
      if (a.estado === 'Cancelado' && b.estado !== 'Cancelado') return 1;
      if (a.estado !== 'Cancelado' && b.estado === 'Cancelado') return -1;
      return a.hora.localeCompare(b.hora);
    });
  },
);

function deriveEstado(a: Appointment, arrivedIds: Set<number>): DrawerEstado {
  if (a.status === 'CANCELLED') return 'Cancelado';
  if (arrivedIds.has(a.id)) return 'Llego';
  return 'Pendiente';
}
