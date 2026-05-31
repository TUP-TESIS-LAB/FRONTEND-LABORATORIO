import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideRouter } from '@angular/router';
import { ReplaySubject } from 'rxjs';
import { Action } from '@ngrx/store';
import { ɵSIGNAL } from '@angular/core';
import { ObraSocialDetailPage } from './obra-social-detail.page';
import { OBRA_SOCIAL_FEATURE_KEY, initialObraSocialState } from '../../store/obra-social.state';
import { loadObraSocial } from '../../store/obra-social.actions';
import { InsurerComplete } from '../../models/insurer.model';

const insurer: InsurerComplete = {
  id: 7, code: 'OSDE', name: 'OSDE', acronym: 'OSDE', insurerType: 'PRIVATE',
  insurerTypeName: 'Prepaga', active: true,
  specificData: { privateHealth: { cuit: '30-1-9', copayPolicy: 'x' } },
  plans: [], contacts: [],
};

/**
 * Workaround: el setup de Vitest (JIT) no registra signal inputs en ɵcmp.inputs,
 * por lo que ComponentRef.setInput() lanza NG0303. Se accede al nodo interno del signal.
 */
function setSignalInput<T>(signalFn: unknown, value: T): void {
  const node = (signalFn as any)[ɵSIGNAL as any];
  if (node && 'value' in node) {
    node.value = value;
  }
}

describe('ObraSocialDetailPage (smoke)', () => {
  let store: MockStore;
  let actions$: ReplaySubject<Action>;

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>(1);
    TestBed.configureTestingModule({
      imports: [ObraSocialDetailPage],
      providers: [
        provideMockStore({ initialState: { [OBRA_SOCIAL_FEATURE_KEY]: { ...initialObraSocialState, selected: insurer } } }),
        provideMockActions(() => actions$),
        provideRouter([]),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  // Sin detectChanges(): el setup de Vitest no renderiza signal inputs / ui-empty-state (NG0950).
  it('despacha loadObraSocial con el id numérico en init', () => {
    const fixture = TestBed.createComponent(ObraSocialDetailPage);
    setSignalInput(fixture.componentInstance.id, '7');
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.ngOnInit();
    expect(spy).toHaveBeenCalledWith(loadObraSocial({ id: 7 }));
  });

  it('cuit() deriva el CUIT del seleccionado', () => {
    const cmp = TestBed.createComponent(ObraSocialDetailPage).componentInstance;
    expect(cmp.cuit()).toBe('30-1-9');
  });
});
