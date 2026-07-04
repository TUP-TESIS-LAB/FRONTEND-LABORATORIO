import { createReducer, on } from '@ngrx/store';
import { NotifConfigState, initialNotifConfigState } from './notificaciones-config.state';
import {
  loadConfigs,
  loadConfigsSuccess,
  loadConfigsFailure,
  updateConfig,
  updateConfigSuccess,
  updateConfigFailure,
  loadEligible,
  loadEligibleSuccess,
  loadEligibleFailure,
} from './notificaciones-config.actions';

export const notifConfigReducer = createReducer(
  initialNotifConfigState,

  on(loadConfigs, (state): NotifConfigState => ({ ...state, error: null })),
  on(loadConfigsSuccess, (state, { eventConfigs }): NotifConfigState => ({
    ...state,
    eventConfigs,
    error: null,
  })),
  on(loadConfigsFailure, (state, { error }): NotifConfigState => ({ ...state, error })),

  on(updateConfig, (state): NotifConfigState => ({ ...state, saving: true, error: null })),
  on(updateConfigSuccess, (state): NotifConfigState => ({ ...state, saving: false })),
  on(updateConfigFailure, (state, { error }): NotifConfigState => ({
    ...state,
    saving: false,
    error,
  })),

  on(loadEligible, (state): NotifConfigState => ({ ...state, error: null })),
  on(loadEligibleSuccess, (state, { eventType, eligible }): NotifConfigState => ({
    ...state,
    eligibleByEventType: { ...state.eligibleByEventType, [eventType]: eligible },
    error: null,
  })),
  on(loadEligibleFailure, (state, { error }): NotifConfigState => ({ ...state, error })),
);
