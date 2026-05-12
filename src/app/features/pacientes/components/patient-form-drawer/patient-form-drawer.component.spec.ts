import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PatientFormDrawerComponent } from './patient-form-drawer.component';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';
import { checkPatientDni } from '../../store/patient.actions';

describe('PatientFormDrawerComponent (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PatientFormDrawerComponent],
      providers: [
        provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('renders without errors when open=false', () => {
    const fixture = TestBed.createComponent(PatientFormDrawerComponent);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('patient', null);
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('dispatches checkPatientDni when a valid dni is typed (create mode)', () => {
    const fixture = TestBed.createComponent(PatientFormDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('patient', null);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.form.get('general.dni')?.setValue('32456789');
    expect(spy).toHaveBeenCalledWith(checkPatientDni({ dni: '32456789' }));
  });

  it('hydrates form from patient input when in edit mode', () => {
    const fixture = TestBed.createComponent(PatientFormDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('patient', {
      id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE', sexAtBirth: 'FEMALE',
      status: 'COMPLETE', contacts: [], addresses: [], coverages: [], active: true,
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.form.get('general.firstName')?.value).toBe('María');
    expect(fixture.componentInstance.form.get('general.dni')?.disabled).toBe(true);
  });
});
