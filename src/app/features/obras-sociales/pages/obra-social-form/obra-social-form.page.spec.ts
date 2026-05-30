import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideRouter } from '@angular/router';
import { ReplaySubject } from 'rxjs';
import { Action } from '@ngrx/store';
import { ObraSocialFormPage } from './obra-social-form.page';
import { OBRA_SOCIAL_FEATURE_KEY, initialObraSocialState } from '../../store/obra-social.state';
import { loadObraSocialCatalogs } from '../../store/obra-social.actions';

describe('ObraSocialFormPage (smoke)', () => {
  let store: MockStore;
  let actions$: ReplaySubject<Action>;

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>(1);
    TestBed.configureTestingModule({
      imports: [ObraSocialFormPage],
      providers: [
        provideMockStore({ initialState: { [OBRA_SOCIAL_FEATURE_KEY]: initialObraSocialState } }),
        provideMockActions(() => actions$),
        provideRouter([]),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  // No usamos detectChanges(): el setup de Vitest del repo no puede renderizar
  // componentes con signal inputs (NG0950). Probamos la lógica de clase directamente.
  it('despacha loadObraSocialCatalogs en init y arranca en paso 0', () => {
    const cmp = TestBed.createComponent(ObraSocialFormPage).componentInstance;
    const spy = vi.spyOn(store, 'dispatch');
    cmp.ngOnInit();
    expect(spy).toHaveBeenCalledWith(loadObraSocialCatalogs());
    expect(cmp.currentStep()).toBe(0);
  });

  it('no permite continuar del paso 0 con el form vacío', () => {
    const cmp = TestBed.createComponent(ObraSocialFormPage).componentInstance;
    expect(cmp.canContinue()).toBe(false);
  });

  it('con aseguradora válida, canContinue(paso 0)=true y goNext avanza al paso 1', () => {
    const cmp = TestBed.createComponent(ObraSocialFormPage).componentInstance;
    cmp.aseguradoraGroup.setValue({
      code: 'NEW', name: 'Nueva OS', acronym: 'NOS', insurerType: 'SOCIAL',
      cuit: '30-12345678-9', authorizationUrl: '', description: '', phone: '', email: '',
    });
    expect(cmp.canContinue()).toBe(true);
    cmp.goNext();
    expect(cmp.currentStep()).toBe(1);
  });
});
