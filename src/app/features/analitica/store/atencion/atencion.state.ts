import { HttpErrorResponse } from '@angular/common/http';
import { Patient } from '../../../pacientes/models/patient.model';
import { Analysis, AttentionResponse, AttentionState } from '../../models/atencion.model';

/**
 * Filtros del dashboard. Solo incluyen lo que efectivamente filtramos en el cliente.
 * `dateFrom/dateTo` se retiraron (FE-1) porque `AttentionResponse` aún no expone una
 * fecha y la UI mostraba inputs no funcionales. Si en el futuro el DTO incluye
 * createdAt / scheduledAt, agregar acá y en `selectFilteredAtenciones`.
 */
export interface AtencionFilters {
  search: string;
  states: AttentionState[];
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
  resolvedPatient: Patient | null;
  patientResolving: boolean;
  patientNotFoundDni: string | null;
  patientResolutionError: HttpErrorResponse | null;
  summaryAnalyses: Analysis[];
  summaryAnalysesLoading: boolean;
}

export const initialAtencionState: AtencionFeatureState = {
  list: [],
  listLoading: false,
  listError: null,
  filters: {
    search: '',
    states: [],
  },
  detail: null,
  detailLoading: false,
  detailError: null,
  mutating: false,
  resolvedPatient: null,
  patientResolving: false,
  patientNotFoundDni: null,
  patientResolutionError: null,
  summaryAnalyses: [],
  summaryAnalysesLoading: false,
};

export const ATENCION_FEATURE_KEY = 'atencion';
