import { ROLES_PERMISOS_FEATURE_KEY, RolesPermisosState, initialRolesPermisosState } from './roles-permisos.state';
import { selectIsDirty, selectWorkingSet } from './roles-permisos.selectors';

function wrap(state: RolesPermisosState) { return { [ROLES_PERMISOS_FEATURE_KEY]: state }; }

describe('roles-permisos selectors', () => {
  it('selectIsDirty false cuando working == granted', () => {
    const st = wrap({ ...initialRolesPermisosState, grantedSet: ['ATENCION', 'TURNOS'], workingSet: ['TURNOS', 'ATENCION'] });
    expect(selectIsDirty(st)).toBe(false);
  });
  it('selectIsDirty true cuando difieren', () => {
    const st = wrap({ ...initialRolesPermisosState, grantedSet: ['ATENCION'], workingSet: ['ATENCION', 'TURNOS'] });
    expect(selectIsDirty(st)).toBe(true);
  });
  it('selectWorkingSet devuelve el working', () => {
    const st = wrap({ ...initialRolesPermisosState, workingSet: ['STOCK'] });
    expect(selectWorkingSet(st)).toEqual(['STOCK']);
  });
});
