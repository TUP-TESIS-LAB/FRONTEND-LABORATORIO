import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { SeccionesPage } from './secciones.page';
import { SECCIONES_FEATURE_KEY, initialSeccionesState } from '../../store/secciones/secciones.state';
import {
  loadSecciones, loadCountBySection, loadUnassignedCount,
} from '../../store/secciones/secciones.actions';
import {
  selectSeccionesConCount, selectUnassignedCount,
} from '../../store/secciones/secciones.selectors';
import { SectionListItemWithCount } from '../../models/section-list-item.model';

function item(id: number, name: string, branches: number, count = 0): SectionListItemWithCount {
  return {
    id, name, active: true, analysisCount: count,
    branches: Array.from({ length: branches }, (_, i) => ({ id: i + 1, code: `B${i + 1}`, name: `Suc ${i + 1}` })),
  };
}

describe('SeccionesPage', () => {
  function setup(seed: SectionListItemWithCount[] = [], unassigned = 0) {
    TestBed.configureTestingModule({
      imports: [SeccionesPage],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: { [SECCIONES_FEATURE_KEY]: initialSeccionesState },
        }),
      ],
    });
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectSeccionesConCount, seed);
    store.overrideSelector(selectUnassignedCount, unassigned);
    store.refreshState();
    const fixture = TestBed.createComponent(SeccionesPage);
    return { fixture, store };
  }

  it('en init dispara load de secciones, count y unassigned', () => {
    const { fixture, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadSecciones());
    expect(spy).toHaveBeenCalledWith(loadCountBySection());
    expect(spy).toHaveBeenCalledWith(loadUnassignedCount());
  });

  it('unusedCount cuenta las secciones sin sucursales', () => {
    const { fixture } = setup([item(1, 'Hemato', 2), item(2, 'Química', 0), item(3, 'Orina', 0)]);
    fixture.detectChanges();
    expect(fixture.componentInstance.unusedCount()).toBe(2);
  });

  it('filtered filtra por nombre (case-insensitive)', () => {
    const { fixture } = setup([item(1, 'Hematología', 1), item(2, 'Química Clínica', 1)]);
    fixture.detectChanges();
    fixture.componentInstance.query.set('quím');
    expect(fixture.componentInstance.filtered().map((s) => s.id)).toEqual([2]);
  });

  it('openCreate abre el drawer en modo crear (editing null)', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    fixture.componentInstance.openCreate();
    expect(fixture.componentInstance.drawerOpen()).toBe(true);
    expect(fixture.componentInstance.editing()).toBeNull();
  });

  it('openEdit abre el drawer con la sección seleccionada', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const sec = item(5, 'Micro', 1);
    fixture.componentInstance.openEdit(sec);
    expect(fixture.componentInstance.drawerOpen()).toBe(true);
    expect(fixture.componentInstance.editing()).toBe(sec);
  });
});
