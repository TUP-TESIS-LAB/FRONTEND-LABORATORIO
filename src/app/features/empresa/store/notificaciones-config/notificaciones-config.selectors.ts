import { createFeatureSelector, createSelector } from '@ngrx/store';
import { NOTIF_CONFIG_FEATURE_KEY, NotifConfigState } from './notificaciones-config.state';

export const selectNotifConfigState =
  createFeatureSelector<NotifConfigState>(NOTIF_CONFIG_FEATURE_KEY);

export const selectEventConfigs = createSelector(
  selectNotifConfigState,
  (state) => state.eventConfigs,
);

export const selectSaving = createSelector(
  selectNotifConfigState,
  (state) => state.saving,
);

export const selectNotifConfigError = createSelector(
  selectNotifConfigState,
  (state) => state.error,
);

export const selectEligible = (eventType: string) =>
  createSelector(
    selectNotifConfigState,
    (state) => state.eligibleByEventType[eventType],
  );
