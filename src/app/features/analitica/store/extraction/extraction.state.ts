import {
  AwaitingExtractionItem,
  ExtractionStats,
  InExtractionItem,
} from '../../models/extraction.model';

export interface ExtractionPending {
  awaiting: boolean;
  mine: boolean;
  stats: boolean;
  mutation: boolean;
}

export interface ExtractionFeatureState {
  awaiting: AwaitingExtractionItem[];
  mine: InExtractionItem[];
  stats: ExtractionStats | null;
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
  search: '',
  pending: { awaiting: false, mine: false, stats: false, mutation: false },
  error: null,
  lastRefreshAt: null,
};
