import { HttpErrorResponse } from '@angular/common/http';
import { Paciente, Protocolo, Nbu } from '../models/analitica.model';

export interface AnaliticaState {
  pacientes: Paciente[];
  protocolos: Protocolo[];
  nbus: Nbu[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialAnaliticaState: AnaliticaState = {
  pacientes: [],
  protocolos: [],
  nbus: [],
  pending: false,
  error: null,
};

export const ANALITICA_FEATURE_KEY = 'analitica';
