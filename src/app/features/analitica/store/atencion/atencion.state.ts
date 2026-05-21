import { HttpErrorResponse } from '@angular/common/http';
import { AttentionResponse, AttentionState } from '../../models/atencion.model';

export interface AtencionFilters {
  search: string;
  states: AttentionState[];
  dateFrom: string; // ISO date (yyyy-mm-dd)
  dateTo: string;
}

export interface AtencionFeatureState {
  list: AttentionResponse[];
  listLoading: boolean;
  listError: HttpErrorResponse | null;
  filters: AtencionFilters;
  detail: AttentionResponse | null;
  detailLoading: boolean;
  detailError: HttpErrorResponse | null;
  mutating: boolean;
}

const today = (): string => new Date().toISOString().slice(0, 10);

export const initialAtencionState: AtencionFeatureState = {
  list: [],
  listLoading: false,
  listError: null,
  filters: {
    search: '',
    states: [],
    dateFrom: today(),
    dateTo: today(),
  },
  detail: null,
  detailLoading: false,
  detailError: null,
  mutating: false,
};

export const ATENCION_FEATURE_KEY = 'atencion';
