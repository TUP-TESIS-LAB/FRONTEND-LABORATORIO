import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RolesPermisosPage } from './roles-permisos.page';
import { ROLES_PERMISOS_FEATURE_KEY, initialRolesPermisosState } from '../store/roles-permisos.state';
import { EMPRESA_FEATURE_KEY, initialEmpresaState } from '@features/empresa/store/empresa.state';
import { loadCatalog, selectUser, toggleSection, saveUserSections } from '../store/roles-permisos.actions';
import { loadUsuarios } from '@features/empresa/store/empresa.actions';

describe('RolesPermisosPage', () => {
  function setup(rp = initialRolesPermisosState) {
    TestBed.configureTestingModule({
      imports: [RolesPermisosPage],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: {
            [ROLES_PERMISOS_FEATURE_KEY]: rp,
            [EMPRESA_FEATURE_KEY]: initialEmpresaState,
          },
        }),
      ],
    });
    const fixture = TestBed.createComponent(RolesPermisosPage);
    const store = TestBed.inject(MockStore);
    return { fixture, store };
  }

  it('en init dispara loadUsuarios + loadCatalog', () => {
    const { fixture, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadCatalog());
    expect(spy).toHaveBeenCalledWith(loadUsuarios({ filters: { page: 0, size: 200, isActive: true } }));
  });

  it('onSelect/onToggle/save despachan las actions', () => {
    const { fixture, store } = setup();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onSelect(7);
    fixture.componentInstance.onToggle('TURNOS');
    fixture.componentInstance.save();
    expect(spy).toHaveBeenCalledWith(selectUser({ userId: 7 }));
    expect(spy).toHaveBeenCalledWith(toggleSection({ code: 'TURNOS' }));
    expect(spy).toHaveBeenCalledWith(saveUserSections());
  });
});
