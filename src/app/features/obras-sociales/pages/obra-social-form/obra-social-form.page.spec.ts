import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ObraSocialFormPage } from './obra-social-form.page';
import { OBRA_SOCIAL_FEATURE_KEY, initialObraSocialState } from '../../store/obra-social.state';
import { loadObraSocialCatalogs } from '../../store/obra-social.actions';

describe('ObraSocialFormPage (smoke)', () => {
  let store: MockStore;
  let actions$: ReplaySubject<unknown>;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);
    TestBed.configureTestingModule({
      imports: [ObraSocialFormPage],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore({ initialState: { [OBRA_SOCIAL_FEATURE_KEY]: initialObraSocialState } }),
        provideMockActions(() => actions$),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('despacha loadObraSocialCatalogs en init y arranca en paso 0', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(ObraSocialFormPage);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadObraSocialCatalogs());
    expect(fixture.componentInstance.currentStep()).toBe(0);
  });

  it('no permite continuar del paso 0 con el form vacío', () => {
    const fixture = TestBed.createComponent(ObraSocialFormPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.canContinue()).toBe(false);
  });

  it('con aseguradora válida, canContinue(paso 0)=true y goNext avanza al paso 1', () => {
    const fixture = TestBed.createComponent(ObraSocialFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.aseguradoraGroup.setValue({
      code: 'NEW', name: 'Nueva OS', acronym: 'NOS', insurerType: 'SOCIAL',
      cuit: '30-12345678-9', authorizationUrl: '', description: '', phone: '', email: '',
    });
    expect(cmp.canContinue()).toBe(true);
    cmp.goNext();
    expect(cmp.currentStep()).toBe(1);
  });
});
