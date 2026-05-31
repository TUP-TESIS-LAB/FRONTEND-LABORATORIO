import { InsurerSummary, InsurerTypeCode } from './insurer.model';

export type InsurerStateFilter = 'active' | 'inactive' | 'all';

export interface ObraSocialPageRequest {
  q?: string;
  state: InsurerStateFilter;
  insurerType?: InsurerTypeCode;
  page: number;
  size: number;
}

export interface ObraSocialPageResult {
  content: InsurerSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
