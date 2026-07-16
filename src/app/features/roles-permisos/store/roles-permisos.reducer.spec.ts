import { HttpErrorResponse } from '@angular/common/http';
import { rolesPermisosReducer } from './roles-permisos.reducer';
import { initialRolesPermisosState } from './roles-permisos.state';
import {
  loadCatalogSuccess, selectUser, loadUserSectionsSuccess, toggleSection,
  saveUserSections, saveUserSectionsSuccess,
} from './roles-permisos.actions';

describe('rolesPermisosReducer', () => {
  it('loadCatalogSuccess setea el catalogo', () => {
    const s = rolesPermisosReducer(initialRolesPermisosState, loadCatalogSuccess({ catalog: [{ code: 'AGENDAS', label: 'Turnos' }] }));
    expect(s.catalog).toHaveLength(1);
    expect(s.pending).toBe(false);
  });
  it('selectUser marca pending y el userId', () => {
    const s = rolesPermisosReducer(initialRolesPermisosState, selectUser({ userId: 7 }));
    expect(s.selectedUserId).toBe(7);
    expect(s.pending).toBe(true);
  });
  it('loadUserSectionsSuccess setea granted=working', () => {
    const s = rolesPermisosReducer(initialRolesPermisosState, loadUserSectionsSuccess({ sections: ['RECEPCION'] }));
    expect(s.grantedSet).toEqual(['RECEPCION']);
    expect(s.workingSet).toEqual(['RECEPCION']);
  });
  it('toggleSection agrega y saca del workingSet', () => {
    let s = rolesPermisosReducer({ ...initialRolesPermisosState, workingSet: [] }, toggleSection({ code: 'AGENDAS' }));
    expect(s.workingSet).toEqual(['AGENDAS']);
    s = rolesPermisosReducer(s, toggleSection({ code: 'AGENDAS' }));
    expect(s.workingSet).toEqual([]);
  });
  it('saveUserSections marca saving; success setea granted=working', () => {
    const saving = rolesPermisosReducer(initialRolesPermisosState, saveUserSections());
    expect(saving.saving).toBe(true);
    const done = rolesPermisosReducer(
      { ...initialRolesPermisosState, workingSet: ['RECEPCION'], saving: true },
      saveUserSectionsSuccess({ sections: ['RECEPCION'] }),
    );
    expect(done.grantedSet).toEqual(['RECEPCION']);
    expect(done.saving).toBe(false);
  });
});
