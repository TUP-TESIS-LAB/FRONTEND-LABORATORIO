export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  nationalId: string | null;       // DNI del paciente (backend lo expone en AppointmentResponse)
  appointmentTime: string;         // ISO
  branchId: number;
  status: string;
}
