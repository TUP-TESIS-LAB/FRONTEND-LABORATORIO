import { HttpErrorResponse } from '@angular/common/http';
import { AccessSection } from '../access.model';

export interface AccessState {
  sections: AccessSection[];
  loaded: boolean;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialAccessState: AccessState = {
  sections: [],
  loaded: false,
  pending: false,
  error: null,
};

export const ACCESS_FEATURE_KEY = 'access';
