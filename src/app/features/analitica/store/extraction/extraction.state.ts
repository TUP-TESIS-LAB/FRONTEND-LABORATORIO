import {
  AwaitingExtractionItem,
  BoxOccupancyItem,
  BranchOption,
  ExtractionStats,
  InExtractionItem,
} from '../../models/extraction.model';

export interface ExtractionPending {
  awaiting: boolean;
  mine: boolean;
  stats: boolean;
  branches: boolean;
  occupancy: boolean;
  mutation: boolean;
}

export interface ExtractionFeatureState {
  awaiting: AwaitingExtractionItem[];
  mine: InExtractionItem[];
  stats: ExtractionStats | null;
  branches: BranchOption[];
  selectedBranchId: number | null;
  boxOccupancy: BoxOccupancyItem[];
  search: string;
  pending: ExtractionPending;
  error: string | null;
  lastRefreshAt: number | null;
}

export const EXTRACTION_FEATURE_KEY = 'extraction';

export const initialExtractionState: ExtractionFeatureState = {
  awaiting: [],
  mine: [],
  stats: null,
  branches: [],
  selectedBranchId: null,
  boxOccupancy: [],
  search: '',
  pending: {
    awaiting: false,
    mine: false,
    stats: false,
    branches: false,
    occupancy: false,
    mutation: false,
  },
  error: null,
  lastRefreshAt: null,
};
