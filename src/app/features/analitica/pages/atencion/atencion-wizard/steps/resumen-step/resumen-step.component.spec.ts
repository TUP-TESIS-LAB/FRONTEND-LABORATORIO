import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject } from 'rxjs';
import { ResumenStepComponent } from './resumen-step.component';
import { ATENCION_FEATURE_KEY, initialAtencionState } from '../../../../../store/atencion/atencion.state';
import { loadAttentionAnalyses, loadAttentionPatient } from '../../../../../store/atencion/atencion.actions';

function attn(): any {
  return { id: 1, patientId: 5, isUrgent: false, indications: null,
           analysisAuthorizations: [{ id: 1, analysisId: 3, isAuthorized: true, active: true }] };
}

describe('ResumenStepComponent', () => {
  let store: MockStore;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenStepComponent],
      providers: [
        provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: {
          ...initialAtencionState,
          resolvedPatient: { id: 5, dni: '18901234', firstName: 'Tute', lastName: 'Gaymer' } as any,
          summaryAnalyses: [{ id: 3, shortCode: 'BIO001', name: 'Hemograma', familyName: null, ubCount: null }],
        } } }),
        provideMockActions(() => new ReplaySubject(1)),
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('despacha loadAttentionAnalyses en init y NO loadAttentionPatient si ya está resuelto', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadAttentionAnalyses({ analysisIds: [3] }));
    expect(spy).not.toHaveBeenCalledWith(loadAttentionPatient({ patientId: 5 }));
  });

  it('muestra apellido, nombre, dni y el nombre del análisis', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    const text = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Gaymer, Tute');
    expect(text).toContain('18901234');
    expect(text).toContain('Hemograma');
  });
});
