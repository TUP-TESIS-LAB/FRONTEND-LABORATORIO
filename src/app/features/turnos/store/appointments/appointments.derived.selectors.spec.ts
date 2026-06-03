import { selectScheduledAppointmentsForDrawer } from './appointments.derived.selectors';
import { Appointment } from '../../models/appointment.model';
import { QueueEntry } from '../../models/queue-entry.model';
import { QueueStatus } from '../../models/queue-status.enum';

function apt(over: Partial<Appointment>): Appointment {
  return {
    id: 0,
    patientId: 1,
    patientName: 'X',
    nationalId: null,
    appointmentTime: '2026-06-02T09:00:00Z',
    branchId: 1,
    status: 'SCHEDULED',
    ...over,
  };
}

function queueEntry(appointmentId: number | null): QueueEntry {
  return {
    id: 999,
    publicCode: 'CT-0001',
    nationalId: '',
    patientId: null,
    branchId: 1,
    appointmentId,
    hasAppointment: appointmentId != null,
    status: QueueStatus.PENDING,
    lastCalledAt: null,
    callCount: 0,
    createdAt: '2026-06-02T09:00:00Z',
  };
}

describe('selectScheduledAppointmentsForDrawer', () => {
  it('marca como Cancelado los appointments con status CANCELLED', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 1, status: 'CANCELLED', patientName: 'Juan', appointmentTime: '2026-06-02T09:00:00Z' })],
      { entries: [], loading: false, callingId: null, error: null },
    );
    expect(result).toEqual([
      { id: 1, hora: '09:00', paciente: 'Juan', estado: 'Cancelado' },
    ]);
  });

  it('marca como Llego los appointments con QueueEntry en la cola actual', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 5, patientName: 'Ana', appointmentTime: '2026-06-02T10:30:00Z' })],
      { entries: [queueEntry(5)], loading: false, callingId: null, error: null },
    );
    expect(result[0].estado).toBe('Llego');
  });

  it('marca como Pendiente el resto', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 2, patientName: 'Pepe', appointmentTime: '2026-06-02T11:00:00Z' })],
      { entries: [], loading: false, callingId: null, error: null },
    );
    expect(result[0].estado).toBe('Pendiente');
  });

  it('ordena por hora ascendente y pone los cancelados al final', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [
        apt({ id: 1, appointmentTime: '2026-06-02T11:00:00Z', patientName: 'A' }),
        apt({ id: 2, status: 'CANCELLED', appointmentTime: '2026-06-02T09:00:00Z', patientName: 'B' }),
        apt({ id: 3, appointmentTime: '2026-06-02T10:00:00Z', patientName: 'C' }),
      ],
      { entries: [], loading: false, callingId: null, error: null },
    );
    expect(result.map(r => r.id)).toEqual([3, 1, 2]);
  });

  it('extrae hora HH:MM del ISO timestamp', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 1, appointmentTime: '2026-06-02T14:25:00Z', patientName: 'X' })],
      { entries: [], loading: false, callingId: null, error: null },
    );
    expect(result[0].hora).toBe('14:25');
  });

  it('tolera entries sin appointmentId (defensivo)', () => {
    const noAptIdEntry = { ...queueEntry(null), appointmentId: undefined as any };
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 5, patientName: 'Ana', appointmentTime: '2026-06-02T10:30:00Z' })],
      { entries: [noAptIdEntry], loading: false, callingId: null, error: null },
    );
    expect(result[0].estado).toBe('Pendiente');
  });
});
