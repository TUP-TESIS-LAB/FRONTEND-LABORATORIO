export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  appointmentTime: string;        // ISO
  branchId: number;
  status: string;
}
