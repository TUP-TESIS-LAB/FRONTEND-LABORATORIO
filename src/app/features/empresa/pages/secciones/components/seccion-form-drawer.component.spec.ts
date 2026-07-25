import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { SeccionFormDrawerComponent } from './seccion-form-drawer.component';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import { SECCIONES_FEATURE_KEY, initialSeccionesState } from '../../../store/secciones/secciones.state';
import { addSeccion, updateSeccion, deleteSeccion } from '../../../store/secciones/secciones.actions';
import { SectionAnalysis } from '@features/analitica/models/section-analysis.model';
import { SectionListItemWithCount } from '../../../models/section-list-item.model';

function section(id: number, branches: number): SectionListItemWithCount {
  return {
    id, name: 'Hemato', active: true, analysisCount: 0,
    branches: Array.from({ length: branches }, (_, i) => ({ id: i + 1, code: `B${i + 1}`, name: `Suc ${i + 1}` })),
  };
}

describe('SeccionFormDrawerComponent', () => {
  function setup(sectionAnalyses: SectionAnalysis[] = []) {
    const api = { sectionAnalyses: vi.fn().mockReturnValue(of(sectionAnalyses)) };
    TestBed.configureTestingModule({
      imports: [SeccionFormDrawerComponent],
      providers: [
        provideNoopAnimations(),
        provideMockStore({ initialState: { [SECCIONES_FEATURE_KEY]: initialSeccionesState } }),
        { provide: AnalysisService, useValue: api },
      ],
    });
    const fixture = TestBed.createComponent(SeccionFormDrawerComponent);
    const store = TestBed.inject(MockStore);
    return { fixture, cmp: fixture.componentInstance, store, api };
  }

  it('crear: submit dispatchea addSeccion con nombre y análisis found', () => {
    const { fixture, cmp, store } = setup();
    cmp.visible = true;
    cmp.section = null;
    fixture.detectChanges();
    cmp.ngOnChanges({ visible: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true } });

    cmp.form.setValue({ name: '  Química  ' });
    cmp.chips.set([
      { analysisId: 5, name: 'Glucosa', state: 'found' },
      { analysisId: null, name: 'X', state: 'notfound' },
    ]);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addSeccion({ name: 'Química', analysisIds: [5] }));
  });

  it('editar: al abrir carga los chips iniciales via sectionAnalyses', () => {
    const { fixture, cmp, api } = setup([{ analysisId: 7, name: 'Urea', shortCode: '0200' }]);
    cmp.visible = true;
    cmp.section = section(3, 2);
    fixture.detectChanges();
    cmp.ngOnChanges({
      section: { currentValue: cmp.section, previousValue: null, firstChange: true, isFirstChange: () => true },
      visible: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true },
    });
    expect(api.sectionAnalyses).toHaveBeenCalledWith(3);
    expect(cmp.chips()).toEqual([{ analysisId: 7, name: 'Urea', state: 'found' }]);
    expect(cmp.editing()).toBe(true);
  });

  it('editar: submit dispatchea updateSeccion con el id', () => {
    const { fixture, cmp, store } = setup();
    cmp.visible = true;
    cmp.section = section(9, 0);
    fixture.detectChanges();
    cmp.ngOnChanges({
      section: { currentValue: cmp.section, previousValue: null, firstChange: true, isFirstChange: () => true },
      visible: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true },
    });
    cmp.form.setValue({ name: 'Micro' });
    cmp.chips.set([{ analysisId: 1, name: 'A', state: 'found' }]);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(updateSeccion({ id: 9, name: 'Micro', analysisIds: [1] }));
  });

  it('borrar: al aceptar el confirm dispatchea deleteSeccion', () => {
    const { fixture, cmp, store } = setup();
    // ConfirmationService está provisto a nivel componente → tomarlo del injector del fixture.
    const confirm = fixture.debugElement.injector.get(ConfirmationService);
    vi.spyOn(confirm, 'confirm').mockImplementation((opts: any) => { opts.accept(); return confirm; });
    cmp.visible = true;
    cmp.section = section(4, 3);
    fixture.detectChanges();
    cmp.ngOnChanges({
      section: { currentValue: cmp.section, previousValue: null, firstChange: true, isFirstChange: () => true },
      visible: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true },
    });
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onDelete();
    expect(spy).toHaveBeenCalledWith(deleteSeccion({ id: 4 }));
  });
});
