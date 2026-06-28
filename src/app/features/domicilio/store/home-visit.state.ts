import { HomeVisit } from '../models/home-visit.model';

export const DOMICILIO_FEATURE_KEY = 'domicilio';

export interface DomicilioState {
  visits: HomeVisit[];
  pending: boolean;
  error: string | null;
}

export const initialDomicilioState: DomicilioState = {
  visits: [],
  pending: false,
  error: null,
};
