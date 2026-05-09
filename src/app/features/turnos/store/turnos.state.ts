import { HttpErrorResponse } from '@angular/common/http';
import { Turno } from '../models/turno.model';

export interface TurnosState {
  turnos: Turno[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialTurnosState: TurnosState = {
  turnos: [],
  pending: false,
  error: null,
};

export const TURNOS_FEATURE_KEY = 'turnos';
