import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { UsuariosPage } from './usuarios.page';
import { setUsuariosFilters } from '../../store/empresa.actions';
import { EMPRESA_FEATURE_KEY, initialEmpresaState } from '../../store/empresa.state';
import { ROLES_PERMISOS_FEATURE_KEY, initialRolesPermisosState } from '@features/roles-permisos/store/roles-permisos.state';
import { loadCatalog, selectUser } from '@features/roles-permisos/store/roles-permisos.actions';
import { selectRpPending } from '@features/roles-permisos/store/roles-permisos.selectors';
import { SucursalService } from '@features/sucursales/services/sucursal.service';
import { Sucursal } from '@features/sucursales/models/sucursal.model';

function branch(id: number, active: boolean): Sucursal {
  return {
    id, code: `S${id}`, description: `Sucursal ${id}`, status: active ? 'ACTIVE' : 'INACTIVE',
    address: null, responsibleUserId: null, active, atencionBoxesCount: 0, extraccionBoxesCount: 0,
  };
}

describe('UsuariosPage', () => {
  function setup(branches: Sucursal[] = []) {
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
        {
          provide: SucursalService,
          useValue: {
            list: () => of({ content: branches, totalElements: branches.length, totalPages: 1, page: 0, size: 20 }),
          },
        },
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

  it('en init carga las sucursales activas del tenant para el drawer', () => {
    const { fixture } = setup([branch(1, true), branch(2, false), branch(3, true)]);
    fixture.detectChanges();
    expect(fixture.componentInstance.branches().map((b) => b.id)).toEqual([1, 3]);
  });

  it('onFilterChange mapea rol (multi) + estado single-value y resetea page=0', () => {
    const { fixture, store } = setup();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onFilterChange({ search: 'ana', roleIds: [2, 5], estado: ['inactive'] });
    expect(spy).toHaveBeenCalledWith(
      setUsuariosFilters({ patch: { search: 'ana', roleIds: [2, 5], isActive: false, page: 0 } }),
    );
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
