import { HttpErrorResponse } from '@angular/common/http';
import type { ValidationListRow } from '../../models/postanalitica.model';

export interface ValidacionProtocolosState {
  rows: ValidationListRow[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialValidacionProtocolosState: ValidacionProtocolosState = {
  rows: [],
  pending: false,
  error: null,
};

export const VALIDACION_PROTOCOLOS_FEATURE_KEY = 'validacionProtocolos';
