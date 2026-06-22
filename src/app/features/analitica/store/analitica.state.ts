import { HttpErrorResponse } from '@angular/common/http';
import { Protocolo } from '../models/analitica.model';

export interface AnaliticaState {
  protocolos: Protocolo[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialAnaliticaState: AnaliticaState = {
  protocolos: [],
  pending: false,
  error: null,
};

export const ANALITICA_FEATURE_KEY = 'analitica';
