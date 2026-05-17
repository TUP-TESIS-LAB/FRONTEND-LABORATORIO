import { HttpErrorResponse } from '@angular/common/http';
import { Patient } from '../models/patient.model';
import { PatientPageRequest } from '../models/patient-page.model';

export interface PatientState {
  items: Patient[];
  totalElements: number;
  totalPages: number;
  pageRequest: PatientPageRequest;
  selected: Patient | null;
  dniCheck: { dni: string; exists: boolean } | null;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialPatientState: PatientState = {
  items: [],
  totalElements: 0,
  totalPages: 0,
  pageRequest: { state: 'active', page: 0, size: 20 },
  selected: null,
  dniCheck: null,
  pending: false,
  error: null,
};

export const PATIENT_FEATURE_KEY = 'patients';
