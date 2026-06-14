import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ValidacionDetalleState, VALIDACION_DETALLE_FEATURE_KEY } from './validacion-detalle.state';
export const selectVDState = createFeatureSelector<ValidacionDetalleState>(VALIDACION_DETALLE_FEATURE_KEY);
export const selectDetalle = createSelector(selectVDState, s => s.detalle);
export const selectDetalleLoading = createSelector(selectVDState, s => s.loading);
export const selectDetalleSaving = createSelector(selectVDState, s => s.saving);
export const selectDetalleError = createSelector(selectVDState, s => s.error);
