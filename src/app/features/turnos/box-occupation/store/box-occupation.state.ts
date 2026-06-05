import { BoxOccupation } from '../models/box-occupation.model';

export const BOX_OCCUPATION_FEATURE_KEY = 'boxOccupation';

export interface BoxOccupationState {
  occupations: BoxOccupation[];
  loading: boolean;
  error: string | null;
}

export const initialBoxOccupationState: BoxOccupationState = {
  occupations: [],
  loading: false,
  error: null,
};
