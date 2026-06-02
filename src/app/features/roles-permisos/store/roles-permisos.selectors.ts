import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RolesPermisosState, ROLES_PERMISOS_FEATURE_KEY } from './roles-permisos.state';

export const selectRpState = createFeatureSelector<RolesPermisosState>(ROLES_PERMISOS_FEATURE_KEY);

export const selectCatalog = createSelector(selectRpState, (s) => s.catalog);
export const selectSelectedUserId = createSelector(selectRpState, (s) => s.selectedUserId);
export const selectWorkingSet = createSelector(selectRpState, (s) => s.workingSet);
export const selectGrantedSet = createSelector(selectRpState, (s) => s.grantedSet);
export const selectRpPending = createSelector(selectRpState, (s) => s.pending);
export const selectRpSaving = createSelector(selectRpState, (s) => s.saving);

export const selectIsDirty = createSelector(selectRpState, (s) => {
  if (s.workingSet.length !== s.grantedSet.length) return true;
  const granted = new Set(s.grantedSet);
  return s.workingSet.some((c) => !granted.has(c));
});
