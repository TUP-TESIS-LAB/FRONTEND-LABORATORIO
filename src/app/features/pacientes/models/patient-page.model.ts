// src/app/features/pacientes/models/patient-page.model.ts
import { Patient, PatientStatus } from './patient.model';

export type PatientStateFilter = 'active' | 'inactive' | 'all';

export interface PatientPageRequest {
  q?: string;
  state: PatientStateFilter;
  status?: PatientStatus;
  page: number;
  size: number;
}

export interface PatientPageResult {
  content: Patient[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
