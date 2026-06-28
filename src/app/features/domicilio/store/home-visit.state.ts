import { HomeVisit } from '../models/home-visit.model';

export const DOMICILIO_FEATURE_KEY = 'domicilio';

export interface DomicilioState {
  visits: HomeVisit[];
  pending: boolean;
  error: string | null;
  myRoute: HomeVisit[];
  myRoutePending: boolean;
  visitDetail: HomeVisit | null;
  detailPending: boolean;
  routeError: string | null;
  detailError: string | null;
}

export const initialDomicilioState: DomicilioState = {
  visits: [],
  pending: false,
  error: null,
  myRoute: [],
  myRoutePending: false,
  visitDetail: null,
  detailPending: false,
  routeError: null,
  detailError: null,
};
