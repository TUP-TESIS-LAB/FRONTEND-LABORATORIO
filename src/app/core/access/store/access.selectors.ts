import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AccessState, ACCESS_FEATURE_KEY } from './access.state';

export const selectAccessState = createFeatureSelector<AccessState>(ACCESS_FEATURE_KEY);
export const selectMySections = createSelector(selectAccessState, (s) => s.sections);
export const selectAccessLoaded = createSelector(selectAccessState, (s) => s.loaded);
