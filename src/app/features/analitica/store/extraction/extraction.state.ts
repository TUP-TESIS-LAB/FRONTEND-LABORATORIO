import {
  AwaitingExtractionItem,
  BoxAssignment,
  BoxOccupancyItem,
  BranchExtractor,
  BranchOption,
  ExtractionStats,
  InExtractionItem,
} from '../../models/extraction.model';

export interface ExtractionPending {
  awaiting: boolean;
  inProgress: boolean;
  stats: boolean;
  branches: boolean;
  occupancy: boolean;
  boxAssignments: boolean;
  branchExtractors: boolean;
  mutation: boolean;
}

export interface ExtractionFeatureState {
  awaiting: AwaitingExtractionItem[];
  /** Todas las atenciones en extracción de la sucursal seleccionada (no solo "mías"). */
  inProgress: InExtractionItem[];
  stats: ExtractionStats | null;
  branches: BranchOption[];
  selectedBranchId: number | null;
  boxOccupancy: BoxOccupancyItem[];
  boxAssignments: BoxAssignment[];
  branchExtractors: BranchExtractor[];
  search: string;
  pending: ExtractionPending;
  error: string | null;
  lastRefreshAt: number | null;
  /**
   * Última asignación exitosa. La page (Task 7) lo lee para armar el toast de undo
   * con timer de 5 s. Se limpia al desasignar exitosamente.
   */
  lastAssigned: { attentionId: number; boxNumber: number; extractorFullName: string } | null;
}

export const EXTRACTION_FEATURE_KEY = 'extraction';

export const initialExtractionState: ExtractionFeatureState = {
  awaiting: [],
  inProgress: [],
  stats: null,
  branches: [],
  selectedBranchId: null,
  boxOccupancy: [],
  boxAssignments: [],
  branchExtractors: [],
  search: '',
  pending: {
    awaiting: false,
    inProgress: false,
    stats: false,
    branches: false,
    occupancy: false,
    boxAssignments: false,
    branchExtractors: false,
    mutation: false,
  },
  error: null,
  lastRefreshAt: null,
  lastAssigned: null,
};
