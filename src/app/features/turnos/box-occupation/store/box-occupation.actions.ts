import { createAction, props } from '@ngrx/store';
import { BoxOccupation, BoxType, OccupyBoxInput } from '../models/box-occupation.model';

export const loadBoxOccupations = createAction(
  '[BoxOccupation] Load',
  props<{ branchId: number; boxType: BoxType }>(),
);
export const loadBoxOccupationsSuccess = createAction(
  '[BoxOccupation] Load Success',
  props<{ occupations: BoxOccupation[] }>(),
);
export const loadBoxOccupationsFailure = createAction(
  '[BoxOccupation] Load Failure',
  props<{ error: string }>(),
);

export const occupyBox = createAction(
  '[BoxOccupation] Occupy',
  props<{ branchId: number; input: OccupyBoxInput }>(),
);
export const occupyBoxSuccess = createAction(
  '[BoxOccupation] Occupy Success',
  props<{ occupation: BoxOccupation }>(),
);
export const occupyBoxFailure = createAction(
  '[BoxOccupation] Occupy Failure',
  props<{ error: string }>(),
);

export const releaseBox = createAction(
  '[BoxOccupation] Release',
  props<{ branchId: number; boxType: BoxType }>(),
);
export const releaseBoxSuccess = createAction('[BoxOccupation] Release Success');
export const releaseBoxFailure = createAction(
  '[BoxOccupation] Release Failure',
  props<{ error: string }>(),
);

export const clearBoxOccupations = createAction('[BoxOccupation] Clear');
