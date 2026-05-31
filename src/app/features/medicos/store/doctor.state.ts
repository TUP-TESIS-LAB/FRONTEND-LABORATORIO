import { HttpErrorResponse } from '@angular/common/http';
import { Doctor } from '../models/doctor.model';

export interface DoctorState {
  items: Doctor[];
  selected: Doctor | null;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialDoctorState: DoctorState = {
  items: [],
  selected: null,
  pending: false,
  error: null,
};

export const DOCTOR_FEATURE_KEY = 'doctors';
