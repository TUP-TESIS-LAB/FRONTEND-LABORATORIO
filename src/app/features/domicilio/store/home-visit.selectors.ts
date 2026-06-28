import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DomicilioState, DOMICILIO_FEATURE_KEY } from './home-visit.state';

export const selectDomicilioState =
  createFeatureSelector<DomicilioState>(DOMICILIO_FEATURE_KEY);

export const selectHomeVisits = createSelector(
  selectDomicilioState,
  state => state.visits,
);

export const selectHomeVisitsPending = createSelector(
  selectDomicilioState,
  state => state.pending,
);

export const selectHomeVisitsError = createSelector(
  selectDomicilioState,
  state => state.error,
);
