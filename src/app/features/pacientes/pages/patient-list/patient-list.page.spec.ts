import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { PatientListPage } from './patient-list.page';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';
import { setPatientPageRequest } from '../../store/patient.actions';
import { PatientPermissionsService } from '../../services/patient-permissions.service';
import { CoveragePlansService } from '../../services/coverage-plans.service';

const mockPlansService = {
  getActivePlans: () => of([{ planId: 1, label: 'Particular', particular: true }]),
};

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
        {
          provide: CoveragePlansService,
          useValue: mockPlansService,
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

  it('rowStatusLabel/Severity muestran "Verificado"/info cuando verifiedAt está seteado', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    const cmp = fixture.componentInstance;
    const base = {
      id: 1, dni: '1', firstName: 'a', lastName: 'b', birthDate: null,
      gender: null, sexAtBirth: null, status: 'COMPLETE' as const,
      source: 'STAFF' as const, contacts: [], addresses: [], coverages: [], active: true,
    };
    expect(cmp.rowStatusLabel({ ...base, verifiedAt: '2026-06-09T10:00:00Z' })).toBe('Verificado');
    expect(cmp.rowStatusSeverity({ ...base, verifiedAt: '2026-06-09T10:00:00Z' })).toBe('info');
    // Sin verificar cae al estado de completitud (label en español).
    expect(cmp.rowStatusLabel({ ...base, verifiedAt: null })).toBe('Completo');
    expect(cmp.rowStatusSeverity({ ...base, verifiedAt: null })).toBe('success');
  });

  it('onFilterChange mapea estado/completitud single-value y resetea page=0', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onFilterChange({ search: '', state: ['inactive'], completos: ['COMPLETE'] });
    expect(spy).toHaveBeenCalledWith(
      setPatientPageRequest({ patch: { state: 'inactive', status: 'COMPLETE', page: 0 } }),
    );
  });

  it('renders a routerLink to /pacientes/nuevo on the "Nuevo paciente" button', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toMatch(/href="[^"]*\/pacientes\/nuevo"/);
  });
});
