import { createFeatureSelector, createSelector } from '@ngrx/store';

import { SectionListItemWithCount } from '../../models/section-list-item.model';
import { SECCIONES_FEATURE_KEY, SeccionesState } from './secciones.state';

export const selectSeccionesState =
  createFeatureSelector<SeccionesState>(SECCIONES_FEATURE_KEY);

export const selectSecciones = createSelector(
  selectSeccionesState,
  (state) => state.secciones,
);

export const selectCountMap = createSelector(
  selectSeccionesState,
  (state) => state.countMap,
);

export const selectUnassignedCount = createSelector(
  selectSeccionesState,
  (state) => state.unassignedCount,
);

export const selectPending = createSelector(
  selectSeccionesState,
  (state) => state.pending,
);

export const selectSeccionesError = createSelector(
  selectSeccionesState,
  (state) => state.error,
);

/** Merge de secciones + count con default 0 para las que no tienen análisis. */
export const selectSeccionesConCount = createSelector(
  selectSecciones,
  selectCountMap,
  (secciones, countMap): SectionListItemWithCount[] =>
    secciones.map((s) => ({ ...s, analysisCount: countMap[s.id] ?? 0 })),
);
