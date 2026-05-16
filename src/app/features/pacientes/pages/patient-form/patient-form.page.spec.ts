import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject } from 'rxjs';
import { PatientFormPage } from './patient-form.page';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';

describe('PatientFormPage', () => {
  let actions$: ReplaySubject<unknown>;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);
    TestBed.configureTestingModule({
      imports: [PatientFormPage],
      providers: [
        provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
        provideMockActions(() => actions$),
        provideNoopAnimations(),
        provideRouter([]),
      ],
    });
  });

  it('renders the create-mode header when there is no id', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const headerText = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(headerText).toContain('Volver');
    expect(headerText).toContain('Nuevo paciente');
  });

  it('renders the edit-mode header when an id is provided', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', '42');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Editar paciente');
  });
});
