import { HttpErrorResponse } from '@angular/common/http';
import { empresaReducer } from './empresa.reducer';
import { initialEmpresaState } from './empresa.state';
import {
  loadUsuarios, loadUsuariosSuccess, loadUsuariosFailure,
  setUsuariosFilters,
  addUsuarioSuccess,
  updateUsuarioSuccess,
  toggleUsuarioStatusSuccess,
  loadRolesSuccess,
  loadWhiteLabelSuccess,
  saveWhiteLabelSuccess,
  loadModulosSuccess,
  toggleModuloSuccess,
} from './empresa.actions';
import { Usuario } from '../models/usuario.model';
import { Rol } from '../models/rol.model';
import { WhiteLabel } from '../models/white-label.model';
import { ModuloTenant } from '../models/modulo.model';

const usuario = (over: Partial<Usuario> = {}): Usuario => ({
  id: 1, firstName: 'Ana', lastName: 'Lopez', username: 'alopez',
  email: 'a@l.com', phone: null, document: '123', isEmailVerified: true,
  isExternal: false, branch: null, isFirstLogin: false, active: true,
  roles: [], ...over,
});

describe('empresaReducer — usuarios', () => {
  it('loadUsuarios marca pending', () => {
    const s = empresaReducer(initialEmpresaState, loadUsuarios({ filters: {} }));
    expect(s.pending).toBe(true);
    expect(s.error).toBeNull();
  });

  it('loadUsuariosSuccess llena la lista y resetea pending', () => {
    const s = empresaReducer(
      { ...initialEmpresaState, pending: true },
      loadUsuariosSuccess({
        result: { content: [usuario()], page: 0, size: 20, totalElements: 1, totalPages: 1 },
      }),
    );
    expect(s.usuarios).toHaveLength(1);
    expect(s.usuariosTotalElements).toBe(1);
    expect(s.pending).toBe(false);
  });

  it('loadUsuariosFailure guarda el error y desmarca pending', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = empresaReducer({ ...initialEmpresaState, pending: true }, loadUsuariosFailure({ error }));
    expect(s.pending).toBe(false);
    expect(s.error).toBe(error);
  });

  it('setUsuariosFilters mergea sin pisar', () => {
    const s = empresaReducer(initialEmpresaState, setUsuariosFilters({ patch: { search: 'ana' } }));
    expect(s.usuariosFilters.search).toBe('ana');
    expect(s.usuariosFilters.size).toBe(20);
  });

  it('addUsuarioSuccess solo resetea pending — la lista se refresca via effect', () => {
    const u = usuario({ id: 99 });
    const initialUsuarios = [usuario({ id: 1 })];
    const s = empresaReducer(
      { ...initialEmpresaState, usuarios: initialUsuarios, usuariosTotalElements: 1, pending: true },
      addUsuarioSuccess({ result: { user: u, firstLoginToken: 'tok' } }),
    );
    expect(s.usuarios).toEqual(initialUsuarios);
    expect(s.usuariosTotalElements).toBe(1);
    expect(s.pending).toBe(false);
  });

  it('updateUsuarioSuccess reemplaza por id', () => {
    const s = empresaReducer(
      { ...initialEmpresaState, usuarios: [usuario({ id: 1, firstName: 'Old' })] },
      updateUsuarioSuccess({ usuario: usuario({ id: 1, firstName: 'New' }) }),
    );
    expect(s.usuarios[0].firstName).toBe('New');
  });

  it('toggleUsuarioStatusSuccess refleja active', () => {
    const s = empresaReducer(
      { ...initialEmpresaState, usuarios: [usuario({ id: 1, active: true })] },
      toggleUsuarioStatusSuccess({ usuario: usuario({ id: 1, active: false }) }),
    );
    expect(s.usuarios[0].active).toBe(false);
  });
});

describe('empresaReducer — roles / white-label / modulos', () => {
  it('loadRolesSuccess setea roles', () => {
    const r: Rol = { id: 1, code: 'ADMIN', description: 'Admin', hierarchy: 1 };
    const s = empresaReducer(initialEmpresaState, loadRolesSuccess({ roles: [r] }));
    expect(s.roles).toEqual([r]);
  });

  it('loadWhiteLabelSuccess y saveWhiteLabelSuccess setean whiteLabel', () => {
    const wl: WhiteLabel = {
      id: 1, targetTenantId: 1, systemName: 'X',
      primaryColor: '#000000', secondaryColor: '#ffffff',
      lightLogoUrl: null, darkLogoUrl: null, active: true,
    };
    const s1 = empresaReducer(initialEmpresaState, loadWhiteLabelSuccess({ whiteLabel: wl }));
    expect(s1.whiteLabel).toBe(wl);
    const s2 = empresaReducer(initialEmpresaState, saveWhiteLabelSuccess({ whiteLabel: wl }));
    expect(s2.whiteLabel).toBe(wl);
  });

  it('loadModulosSuccess y toggleModuloSuccess actualizan la lista', () => {
    const mods: ModuloTenant[] = [
      { moduleCode: 'PORTAL', enabled: false },
      { moduleCode: 'TURNOS', enabled: true },
    ];
    const s1 = empresaReducer(initialEmpresaState, loadModulosSuccess({ modulos: mods }));
    expect(s1.modulos).toEqual(mods);
    const s2 = empresaReducer(s1, toggleModuloSuccess({ code: 'PORTAL', enable: true }));
    expect(s2.modulos.find((m) => m.moduleCode === 'PORTAL')!.enabled).toBe(true);
  });
});
