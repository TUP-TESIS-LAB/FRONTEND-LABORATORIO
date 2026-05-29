import { createAction, props } from '@ngrx/store';

export const loadBranchTotemConfig = createAction(
  '[BranchTotemConfig] Load',
  props<{ branchId: number }>()
);

export const loadBranchTotemConfigSuccess = createAction(
  '[BranchTotemConfig] Load Success',
  props<{ branchId: number; enabled: boolean }>()
);

export const loadBranchTotemConfigFailure = createAction(
  '[BranchTotemConfig] Load Failure',
  props<{ error: unknown }>()
);
