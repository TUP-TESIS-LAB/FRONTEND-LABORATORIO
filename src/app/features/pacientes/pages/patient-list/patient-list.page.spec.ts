import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { PatientListPage } from './patient-list.page';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';
import { setPatientPageRequest } from '../../store/patient.actions';
import { PatientPermissionsService } from '../../services/patient-permissions.service';

describe('PatientListPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PatientListPage],
      providers: [
        provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: PatientPermissionsService,
          useValue: { canMutate: signal(true) },
        },
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('dispatches setPatientPageRequest on table lazy load init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(
      setPatientPageRequest({ patch: { page: 0, size: initialPatientState.pageRequest.size } }),
    );
  });

  it('setState dispatches setPatientPageRequest with state and page=0', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.setState('inactive');
    expect(spy).toHaveBeenCalledWith(setPatientPageRequest({ patch: { state: 'inactive', page: 0 } }));
  });

  it('onPage maps first/rows to page/size', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onPage({ first: 40, rows: 20 });
    expect(spy).toHaveBeenCalledWith(setPatientPageRequest({ patch: { page: 2, size: 20 } }));
  });

  it('renders a routerLink to /pacientes/nuevo on the "Nuevo paciente" button', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toMatch(/href="[^"]*\/pacientes\/nuevo"/);
  });
});
