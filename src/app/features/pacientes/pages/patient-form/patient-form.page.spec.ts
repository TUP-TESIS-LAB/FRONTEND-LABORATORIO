import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject } from 'rxjs';
import { of } from 'rxjs';
import { PatientFormPage } from './patient-form.page';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';
import { CoveragePlansService } from '../../services/coverage-plans.service';

const mockPlansService = {
  getActivePlans: () => of([{ planId: 1, label: 'Particular', particular: true }]),
};

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
        { provide: CoveragePlansService, useValue: mockPlansService },
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

  it('dispatches checkPatientDni when a valid dni is typed in create mode', async () => {
    const { checkPatientDni } = await import('../../store/patient.actions');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.form.get('general.dni')?.setValue('32456789');
    expect(spy).toHaveBeenCalledWith(checkPatientDni({ dni: '32456789' }));
  });

  it('dispatches addPatient on submit only after advancing to the last step', async () => {
    const { addPatient } = await import('../../store/patient.actions');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.form.patchValue({
      general: {
        firstName: 'Ana', lastName: 'Pérez', dni: '12345678',
        birthDate: new Date('1990-01-01'),
        gender: 'FEMALE', sexAtBirth: 'FEMALE',
      },
    });
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    // En alta, el botón Registrar no se muestra hasta llegar al último paso (Resumen)
    expect(cmp.showSubmitButton()).toBe(false);
    // Avanzar hasta paso 3 (Resumen)
    cmp.goNext();
    cmp.goNext();
    cmp.goNext();
    fixture.detectChanges();
    expect(cmp.showSubmitButton()).toBe(true);
    cmp.onSubmit();
    expect(spy).toHaveBeenCalled();
    const dispatched = spy.mock.calls[0][0] as unknown as { type: string; req: { firstName: string; dni: string } };
    expect(dispatched.type).toBe('[Patient Form] Add Patient');
    expect(dispatched.req.firstName).toBe('Ana');
    expect(dispatched.req.dni).toBe('12345678');
  });

  it('navigates to /pacientes after addPatientSuccess', async () => {
    const { addPatientSuccess } = await import('../../store/patient.actions');
    const { Router } = await import('@angular/router');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const patient = {
      id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE' as const, sexAtBirth: 'FEMALE' as const,
      status: 'COMPLETE' as const, source: 'STAFF' as const, verifiedAt: null, contacts: [], addresses: [], coverages: [], active: true, accountStatus: 'NONE' as const,
    };
    actions$.next(addPatientSuccess({ patient }));
    expect(navSpy).toHaveBeenCalledWith('/pacientes');
  });

  it('navigates to /pacientes after updatePatientSuccess', async () => {
    const { updatePatientSuccess } = await import('../../store/patient.actions');
    const { Router } = await import('@angular/router');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const patient = {
      id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE' as const, sexAtBirth: 'FEMALE' as const,
      status: 'COMPLETE' as const, source: 'STAFF' as const, verifiedAt: null, contacts: [], addresses: [], coverages: [], active: true, accountStatus: 'NONE' as const,
    };
    actions$.next(updatePatientSuccess({ patient }));
    expect(navSpy).toHaveBeenCalledWith('/pacientes');
  });

  it('navigates back without confirmation when the form is pristine', async () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const { Router } = await import('@angular/router');
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.componentInstance.onBack();
    expect(navSpy).toHaveBeenCalledWith(['/pacientes']);
  });

  it('opens confirmation when the form is dirty, navigates only on accept', async () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    fixture.componentInstance.form.get('general.firstName')?.setValue('Ana');
    fixture.componentInstance.form.markAsDirty();
    const { Router } = await import('@angular/router');
    const { ConfirmationService } = await import('primeng/api');
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const confirmSvc = fixture.debugElement.injector.get(ConfirmationService);
    const confirmSpy = vi.spyOn(confirmSvc, 'confirm')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation((opts: any) => { opts.accept?.(); return confirmSvc; });
    fixture.componentInstance.onBack();
    expect(confirmSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/pacientes']);
  });

  it('submits on Ctrl+S', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const submitSpy = vi.spyOn(fixture.componentInstance, 'onSubmit');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    expect(submitSpy).toHaveBeenCalled();
  });

  it('Ctrl+S en alta desde paso 0 NO dispatcha addPatient (canSubmit chequea isLastStep)', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.form.patchValue({
      general: {
        firstName: 'Ana', lastName: 'Pérez', dni: '12345678',
        birthDate: new Date('1990-01-01'),
        gender: 'FEMALE', sexAtBirth: 'FEMALE',
      },
    });
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    expect(cmp.canSubmit()).toBe(false); // paso 0 != last step
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    const addCalls = spy.mock.calls.filter(
      (c) => (c[0] as { type?: string }).type === '[Patient Form] Add Patient'
    );
    expect(addCalls.length).toBe(0);
  });

  it('goes back on Escape', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const backSpy = vi.spyOn(fixture.componentInstance, 'onBack');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(backSpy).toHaveBeenCalled();
  });

  it('does not go back on Escape while a PrimeNG overlay is open', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const overlay = document.createElement('div');
    overlay.className = 'p-datepicker-panel';
    document.body.appendChild(overlay);
    try {
      const backSpy = vi.spyOn(fixture.componentInstance, 'onBack');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(backSpy).not.toHaveBeenCalled();
    } finally {
      overlay.remove();
    }
  });

  it('updates formStatusLabel to "Cambios sin guardar" when a field becomes dirty', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    expect(cmp.formStatusLabel()).toBe('Sin cambios');
    cmp.form.get('general.firstName')?.setValue('Ana');
    cmp.form.markAsDirty();
    expect(cmp.formStatusLabel()).toBe('● Cambios sin guardar');
  });

  it('starts edit mode with all steps visited and submit button visible from step 0', async () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    const store = TestBed.inject(MockStore);
    const { initialPatientState, PATIENT_FEATURE_KEY: KEY } = await import('../../store/patient.state');
    const patient = {
      id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE' as const, sexAtBirth: 'FEMALE' as const,
      status: 'COMPLETE' as const, source: 'STAFF' as const, verifiedAt: null, contacts: [], addresses: [], coverages: [], active: true, accountStatus: 'NONE' as const,
    };
    store.setState({ [KEY]: { ...initialPatientState, selected: patient } });
    store.refreshState();
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    expect([...cmp.visited()].sort()).toEqual([0, 1, 2]);
    expect(cmp.showSubmitButton()).toBe(true);
    expect(cmp.showContinueButton()).toBe(false);
  });

  it('disables Continuar on step 0 when general subgroup is invalid', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    expect(cmp.canContinue()).toBe(false);
    cmp.form.patchValue({
      general: {
        firstName: 'Ana', lastName: 'Pérez', dni: '12345678',
        birthDate: new Date('1990-01-01'),
        gender: 'FEMALE', sexAtBirth: 'FEMALE',
      },
    });
    expect(cmp.canContinue()).toBe(true);
  });

  it('goNext on step 0 with invalid general does not advance and marks touched', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.goNext();
    expect(cmp.currentStep()).toBe(0);
    expect(cmp.form.get('general.firstName')?.touched).toBe(true);
  });

  it('goToStep ignores indexes that are not yet visited', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.goToStep(2);
    expect(cmp.currentStep()).toBe(0);
  });
});
