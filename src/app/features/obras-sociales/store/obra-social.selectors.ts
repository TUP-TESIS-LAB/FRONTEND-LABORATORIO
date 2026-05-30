import { createFeatureSelector, createSelector } from '@ngrx/store';
import { OBRA_SOCIAL_FEATURE_KEY, ObraSocialState } from './obra-social.state';
import { NbuOption } from '../models/catalogs.model';

export const selectObraSocialState = createFeatureSelector<ObraSocialState>(OBRA_SOCIAL_FEATURE_KEY);

export const selectObraSocialItems = createSelector(selectObraSocialState, (s) => s.items);
export const selectObraSocialTotalElements = createSelector(selectObraSocialState, (s) => s.totalElements);
export const selectObraSocialPageRequest = createSelector(selectObraSocialState, (s) => s.pageRequest);
export const selectObraSocialPending = createSelector(selectObraSocialState, (s) => s.pending);
export const selectObraSocialCreating = createSelector(selectObraSocialState, (s) => s.creating);
export const selectSelectedObraSocial = createSelector(selectObraSocialState, (s) => s.selected);
export const selectObraSocialInsurerTypes = createSelector(selectObraSocialState, (s) => s.insurerTypes);
export const selectObraSocialContactTypes = createSelector(selectObraSocialState, (s) => s.contactTypes);

export const selectNbuOptions = createSelector(selectObraSocialState, (s): NbuOption[] =>
  [...s.nbuVersions]
    .sort((a, b) => b.publicationYear - a.publicationYear)
    .map((v) => ({ label: v.versionCode, value: v.id })),
);
