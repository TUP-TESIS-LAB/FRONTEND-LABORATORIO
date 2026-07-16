import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BoxOccupationState, BOX_OCCUPATION_FEATURE_KEY } from './box-occupation.state';

export const selectBoxOccupationState = createFeatureSelector<BoxOccupationState>(BOX_OCCUPATION_FEATURE_KEY);
export const selectAllOccupations = createSelector(selectBoxOccupationState, s => s.occupations);
export const selectOccupationsLoading = createSelector(selectBoxOccupationState, s => s.loading);
