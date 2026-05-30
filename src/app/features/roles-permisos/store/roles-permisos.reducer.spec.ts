import { HttpErrorResponse } from '@angular/common/http';
import { rolesPermisosReducer } from './roles-permisos.reducer';
import { initialRolesPermisosState } from './roles-permisos.state';
import {
  loadCatalogSuccess, selectUser, loadUserSectionsSuccess, toggleSection,
  saveUserSections, saveUserSectionsSuccess,
} from './roles-permisos.actions';

describe('rolesPermisosReducer', () => {
  it('loadCatalogSuccess setea el catalogo', () => {
    const s = rolesPermisosReducer(initialRolesPermisosState, loadCatalogSuccess({ catalog: [{ code: 'TURNOS', label: 'Turnos' }] }));
    expect(s.catalog).toHaveLength(1);
    expect(s.pending).toBe(false);
  });
  it('selectUser marca pending y el userId', () => {
    const s = rolesPermisosReducer(initialRolesPermisosState, selectUser({ userId: 7 }));
    expect(s.selectedUserId).toBe(7);
    expect(s.pending).toBe(true);
  });
  it('loadUserSectionsSuccess setea granted=working', () => {
    const s = rolesPermisosReducer(initialRolesPermisosState, loadUserSectionsSuccess({ sections: ['ATENCION'] }));
    expect(s.grantedSet).toEqual(['ATENCION']);
    expect(s.workingSet).toEqual(['ATENCION']);
  });
  it('toggleSection agrega y saca del workingSet', () => {
    let s = rolesPermisosReducer({ ...initialRolesPermisosState, workingSet: [] }, toggleSection({ code: 'TURNOS' }));
    expect(s.workingSet).toEqual(['TURNOS']);
    s = rolesPermisosReducer(s, toggleSection({ code: 'TURNOS' }));
    expect(s.workingSet).toEqual([]);
  });
  it('saveUserSections marca saving; success setea granted=working', () => {
    const saving = rolesPermisosReducer(initialRolesPermisosState, saveUserSections());
    expect(saving.saving).toBe(true);
    const done = rolesPermisosReducer(
      { ...initialRolesPermisosState, workingSet: ['ATENCION'], saving: true },
      saveUserSectionsSuccess({ sections: ['ATENCION'] }),
    );
    expect(done.grantedSet).toEqual(['ATENCION']);
    expect(done.saving).toBe(false);
  });
});
