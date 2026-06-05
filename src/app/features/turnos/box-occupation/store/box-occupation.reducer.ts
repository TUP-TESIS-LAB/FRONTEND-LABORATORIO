import { createReducer, on } from '@ngrx/store';
import { BoxOccupationState, initialBoxOccupationState } from './box-occupation.state';
import * as A from './box-occupation.actions';

export const boxOccupationReducer = createReducer(
  initialBoxOccupationState,
  on(A.loadBoxOccupations, (s): BoxOccupationState => ({ ...s, loading: true, error: null })),
  on(A.loadBoxOccupationsSuccess, (s, { occupations }): BoxOccupationState => ({ ...s, loading: false, occupations })),
  on(A.loadBoxOccupationsFailure, (s, { error }): BoxOccupationState => ({ ...s, loading: false, error })),

  on(A.occupyBox, (s): BoxOccupationState => ({ ...s, loading: true, error: null })),
  on(A.occupyBoxSuccess, (s): BoxOccupationState => ({ ...s, loading: false })),
  on(A.occupyBoxFailure, (s, { error }): BoxOccupationState => ({ ...s, loading: false, error })),

  on(A.releaseBox, (s): BoxOccupationState => ({ ...s, loading: true, error: null })),
  on(A.releaseBoxSuccess, (s): BoxOccupationState => ({ ...s, loading: false })),
  on(A.releaseBoxFailure, (s, { error }): BoxOccupationState => ({ ...s, loading: false, error })),

  on(A.clearBoxOccupations, (): BoxOccupationState => initialBoxOccupationState),
);
