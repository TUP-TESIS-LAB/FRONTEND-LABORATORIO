import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { ObraSocialEffects } from './obra-social.effects';
import { ObraSocialService } from '../services/obra-social.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadObrasSociales, loadObrasSocialesSuccess, loadObrasSocialesFailure,
  loadObraSocial, loadObraSocialSuccess,
  createObraSocial, createObraSocialSuccess, createObraSocialFailure,
  loadObraSocialCatalogs, loadObraSocialCatalogsSuccess,
} from './obra-social.actions';
import { initialObraSocialState, OBRA_SOCIAL_FEATURE_KEY } from './obra-social.state';
import { InsurerComplete } from '../models/insurer.model';
import { WizardCreate } from '../models/wizard.model';

const insurer: InsurerComplete = {
  id: 1, code: 'C', name: 'OS', acronym: 'A', insurerType: 'SOCIAL',
  insurerTypeName: 'Obra Social', active: true, plans: [], contacts: [],
};
const wizard: WizardCreate = {
  insurer: { code: 'C', name: 'OS', acronym: 'A', insurerType: 'SOCIAL', specificData: null },
  plans: [], contacts: [],
};

describe('ObraSocialEffects', () => {
  let actions$: Observable<Action>;
  let svc: {
    search: ReturnType<typeof vi.fn>; getCompleteById: ReturnType<typeof vi.fn>;
    createFromWizard: ReturnType<typeof vi.fn>;
    getInsurerTypes: ReturnType<typeof vi.fn>; getNbuVersions: ReturnType<typeof vi.fn>;
    getContactTypes: ReturnType<typeof vi.fn>;
  };
  const notify = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn(), show: vi.fn(), dismiss: vi.fn(), clear: vi.fn() };

  beforeEach(() => {
    svc = {
      search: vi.fn(), getCompleteById: vi.fn(), createFromWizard: vi.fn(),
      getInsurerTypes: vi.fn(), getNbuVersions: vi.fn(), getContactTypes: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        ObraSocialEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { [OBRA_SOCIAL_FEATURE_KEY]: initialObraSocialState } }),
        { provide: ObraSocialService, useValue: svc },
        { provide: NotificationService, useValue: notify },
      ],
    });
  });

  it('loadObrasSociales$ mapea a success', () =>
    new Promise<void>((resolve) => {
      svc.search.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }));
      actions$ = of(loadObrasSociales({ req: initialObraSocialState.pageRequest }));
      TestBed.inject(ObraSocialEffects).loadObrasSociales$.subscribe((a) => {
        expect(a.type).toBe(loadObrasSocialesSuccess.type);
        resolve();
      });
    }));

  it('loadObrasSociales$ mapea error a failure y notifica', () =>
    new Promise<void>((resolve) => {
      svc.search.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      actions$ = of(loadObrasSociales({ req: initialObraSocialState.pageRequest }));
      TestBed.inject(ObraSocialEffects).loadObrasSociales$.subscribe((a) => {
        expect(a.type).toBe(loadObrasSocialesFailure.type);
        expect(notify.error).toHaveBeenCalled();
        resolve();
      });
    }));

  it('loadObraSocial$ mapea a success', () =>
    new Promise<void>((resolve) => {
      svc.getCompleteById.mockReturnValue(of(insurer));
      actions$ = of(loadObraSocial({ id: 1 }));
      TestBed.inject(ObraSocialEffects).loadObraSocial$.subscribe((a) => {
        expect(a.type).toBe(loadObraSocialSuccess.type);
        resolve();
      });
    }));

  it('createObraSocial$ mapea a success y notifica éxito', () =>
    new Promise<void>((resolve) => {
      svc.createFromWizard.mockReturnValue(of(insurer));
      actions$ = of(createObraSocial({ payload: wizard }));
      TestBed.inject(ObraSocialEffects).createObraSocial$.subscribe((a) => {
        expect(a.type).toBe(createObraSocialSuccess.type);
        expect(notify.success).toHaveBeenCalled();
        resolve();
      });
    }));

  it('createObraSocial$ mapea error a failure y notifica', () =>
    new Promise<void>((resolve) => {
      svc.createFromWizard.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
      actions$ = of(createObraSocial({ payload: wizard }));
      TestBed.inject(ObraSocialEffects).createObraSocial$.subscribe((a) => {
        expect(a.type).toBe(createObraSocialFailure.type);
        expect(notify.error).toHaveBeenCalled();
        resolve();
      });
    }));

  it('loadObraSocialCatalogs$ combina los 3 catálogos en success', () =>
    new Promise<void>((resolve) => {
      svc.getInsurerTypes.mockReturnValue(of([{ name: 'SOCIAL', description: 'Obra Social' }]));
      svc.getNbuVersions.mockReturnValue(of([{ id: 1, versionCode: '2021_2024', publicationYear: 2021, effectivityDate: '2021-01-01' }]));
      svc.getContactTypes.mockReturnValue(of([{ name: 'PHONE', description: 'Teléfono' }]));
      actions$ = of(loadObraSocialCatalogs());
      TestBed.inject(ObraSocialEffects).loadObraSocialCatalogs$.subscribe((a) => {
        expect(a.type).toBe(loadObraSocialCatalogsSuccess.type);
        resolve();
      });
    }));
});
