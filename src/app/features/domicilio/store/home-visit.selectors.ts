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

export const selectMyRoute = createSelector(
  selectDomicilioState,
  state => state.myRoute,
);

export const selectMyRoutePending = createSelector(
  selectDomicilioState,
  state => state.myRoutePending,
);

export const selectMyRouteError = createSelector(
  selectDomicilioState,
  state => state.routeError,
);

export const selectVisitDetail = createSelector(
  selectDomicilioState,
  state => state.visitDetail,
);

export const selectDetailPending = createSelector(
  selectDomicilioState,
  state => state.detailPending,
);

export const selectDetailError = createSelector(
  selectDomicilioState,
  state => state.detailError,
);

export const selectActionPending = createSelector(
  selectDomicilioState,
  state => state.actionPending,
);

export const selectLastPreparedLabels = createSelector(
  selectDomicilioState,
  state => state.lastPreparedLabels,
);

export const selectCustody = createSelector(
  selectDomicilioState,
  state => state.custody,
);

export const selectCustodyPending = createSelector(
  selectDomicilioState,
  state => state.custodyPending,
);
