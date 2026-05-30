import { HttpErrorResponse } from '@angular/common/http';
import { AccessSection, SectionResponse } from '@core/access/access.model';

export interface RolesPermisosState {
  catalog: SectionResponse[];
  selectedUserId: number | null;
  grantedSet: AccessSection[];
  workingSet: AccessSection[];
  pending: boolean;
  saving: boolean;
  error: HttpErrorResponse | null;
}

export const initialRolesPermisosState: RolesPermisosState = {
  catalog: [],
  selectedUserId: null,
  grantedSet: [],
  workingSet: [],
  pending: false,
  saving: false,
  error: null,
};

export const ROLES_PERMISOS_FEATURE_KEY = 'rolesPermisos';
