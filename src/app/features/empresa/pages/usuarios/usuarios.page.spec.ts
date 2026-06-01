import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { UsuariosPage } from './usuarios.page';
import { EMPRESA_FEATURE_KEY, initialEmpresaState } from '../../store/empresa.state';
import { ROLES_PERMISOS_FEATURE_KEY, initialRolesPermisosState } from '@features/roles-permisos/store/roles-permisos.state';
import { loadCatalog, selectUser } from '@features/roles-permisos/store/roles-permisos.actions';

describe('UsuariosPage', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [UsuariosPage],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: {
            [EMPRESA_FEATURE_KEY]: initialEmpresaState,
            [ROLES_PERMISOS_FEATURE_KEY]: initialRolesPermisosState,
          },
        }),
      ],
    });
    const fixture = TestBed.createComponent(UsuariosPage);
    const store = TestBed.inject(MockStore);
    return { fixture, store };
  }

  it('en init dispara loadCatalog', () => {
    const { fixture, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadCatalog());
  });

  it('openEdit precarga las secciones del usuario', () => {
    const { fixture, store } = setup();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.openEdit({ id: 7, roles: [] } as any);
    expect(spy).toHaveBeenCalledWith(selectUser({ userId: 7 }));
  });
});
