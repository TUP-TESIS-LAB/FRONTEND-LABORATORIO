export interface PatientGuardian {
  userPatientId: number;
  titularNombre: string;
  titularDni: string;
  bond: string;
  status: 'CREATED' | 'VERIFIED' | 'REJECTED';
}
