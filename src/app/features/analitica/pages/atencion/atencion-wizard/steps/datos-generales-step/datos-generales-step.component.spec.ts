import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { DatosGeneralesStepComponent } from './datos-generales-step.component';
import { Patient } from '@features/pacientes/models/patient.model';
import * as A from '../../../../../store/atencion/atencion.actions';
import { readPendingDni } from '../../../../../utils/atencion-session-store';

const samplePatient = (over: Partial<Patient> = {}): Patient => ({
  id: 1, dni: '32456789', firstName: 'Juan', lastName: 'Pérez',
  birthDate: '1985-05-12', gender: 'M', sexAtBirth: 'M', isVerified: true, isActive: true,
  hasGuardian: false, guardians: [], addresses: [], contacts: [], coverages: [], status: 'ACTIVE',
  ...over,
} as unknown as Patient);

describe('DatosGeneralesStepComponent', () => {
  let fixture: ComponentFixture<DatosGeneralesStepComponent>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let dispatched: any[];

  beforeEach(async () => {
    sessionStorage.clear();
    router = { navigate: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [DatosGeneralesStepComponent],
      providers: [
        provideMockStore({ selectors: [] }),
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 42);
    dispatched = [];
    (fixture.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((a: any) => dispatched.push(a));
  });

  it('onPatientNotFound writes pending DNI + session, then navigates to /pacientes/form', () => {
    fixture.componentInstance.onPatientNotFound('32456789');
    expect(readPendingDni()).toBe('32456789');
    expect(router.navigate).toHaveBeenCalledWith(['/pacientes/form'], {
      queryParams: { dni: '32456789', returnTo: '/analitica/atencion/42' },
    });
  });

  it('onContinue with patient dispatches assignGeneralData', () => {
    const p = samplePatient();
    fixture.componentInstance.onPatientSelected(p);
    fixture.componentInstance.form.indications = 'Ayuno 8hs';
    fixture.componentInstance.onContinue();
    const action = dispatched.find((a) => a.type === A.assignGeneralData.type);
    expect(action.id).toBe(42);
    expect(action.payload.patientId).toBe(1);
    expect(action.payload.indications).toBe('Ayuno 8hs');
  });

  it('onContinue without patient does NOT dispatch', () => {
    fixture.componentInstance.onContinue();
    expect(dispatched.find((a) => a.type === A.assignGeneralData.type)).toBeUndefined();
  });
});
