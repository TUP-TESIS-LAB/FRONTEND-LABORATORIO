import { createReducer, on } from '@ngrx/store';
import { RolesPermisosState, initialRolesPermisosState } from './roles-permisos.state';
import {
  loadCatalog, loadCatalogSuccess, loadCatalogFailure,
  selectUser, loadUserSectionsSuccess, loadUserSectionsFailure,
  toggleSection, saveUserSections, saveUserSectionsSuccess, saveUserSectionsFailure,
} from './roles-permisos.actions';

export const rolesPermisosReducer = createReducer(
  initialRolesPermisosState,

  on(loadCatalog, (s): RolesPermisosState => ({ ...s, pending: true, error: null })),
  on(loadCatalogSuccess, (s, { catalog }): RolesPermisosState => ({ ...s, catalog, pending: false })),
  on(loadCatalogFailure, (s, { error }): RolesPermisosState => ({ ...s, pending: false, error })),

  on(selectUser, (s, { userId }): RolesPermisosState => ({
    ...s, selectedUserId: userId, pending: true, error: null,
  })),
  on(loadUserSectionsSuccess, (s, { sections }): RolesPermisosState => ({
    ...s, grantedSet: sections, workingSet: sections, pending: false,
  })),
  on(loadUserSectionsFailure, (s, { error }): RolesPermisosState => ({ ...s, pending: false, error })),

  on(toggleSection, (s, { code }): RolesPermisosState => ({
    ...s,
    workingSet: s.workingSet.includes(code)
      ? s.workingSet.filter((c) => c !== code)
      : [...s.workingSet, code],
  })),

  on(saveUserSections, (s): RolesPermisosState => ({ ...s, saving: true, error: null })),
  on(saveUserSectionsSuccess, (s, { sections }): RolesPermisosState => ({
    ...s, grantedSet: sections, workingSet: sections, saving: false,
  })),
  on(saveUserSectionsFailure, (s, { error }): RolesPermisosState => ({ ...s, saving: false, error })),
);
