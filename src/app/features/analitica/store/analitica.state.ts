import { HttpErrorResponse } from '@angular/common/http';
import { Protocolo, Nbu } from '../models/analitica.model';

export interface AnaliticaState {
  protocolos: Protocolo[];
  nbus: Nbu[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialAnaliticaState: AnaliticaState = {
  protocolos: [],
  nbus: [],
  pending: false,
  error: null,
};

export const ANALITICA_FEATURE_KEY = 'analitica';
