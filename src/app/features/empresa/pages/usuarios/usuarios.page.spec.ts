import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { UsuariosPage } from './usuarios.page';
import { EMPRESA_FEATURE_KEY, initialEmpresaState } from '../../store/empresa.state';
import { ROLES_PERMISOS_FEATURE_KEY, initialRolesPermisosState } from '@features/roles-permisos/store/roles-permisos.state';
import { loadCatalog, selectUser } from '@features/roles-permisos/store/roles-permisos.actions';
import { selectRpPending } from '@features/roles-permisos/store/roles-permisos.selectors';

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
    store.overrideSelector(selectRpPending, false);
    store.refreshState();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.openEdit({ id: 7, roles: [] } as any);
    expect(spy).toHaveBeenCalledWith(selectUser({ userId: 7 }));
  });

  it('openEdit no abre el drawer hasta que terminó de cargar las secciones', () => {
    const { fixture, store } = setup();
    store.overrideSelector(selectRpPending, true);
    store.refreshState();
    fixture.detectChanges();

    fixture.componentInstance.openEdit({ id: 7, roles: [] } as any);
    expect(fixture.componentInstance.formOpen()).toBe(false); // pending=true → no abre

    store.overrideSelector(selectRpPending, false);
    store.refreshState();
    expect(fixture.componentInstance.formOpen()).toBe(true);  // pending=false → abre
  });
});
