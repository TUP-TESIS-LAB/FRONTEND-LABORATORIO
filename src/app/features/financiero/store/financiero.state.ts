import { HttpErrorResponse } from '@angular/common/http';
import { Pago, Cobertura, Movimiento } from '../models/financiero.model';

export interface FinancieroState {
  pagos: Pago[];
  coberturas: Cobertura[];
  movimientos: Movimiento[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialFinancieroState: FinancieroState = {
  pagos: [],
  coberturas: [],
  movimientos: [],
  pending: false,
  error: null,
};

export const FINANCIERO_FEATURE_KEY = 'financiero';
