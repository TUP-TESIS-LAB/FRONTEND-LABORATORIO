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

  it('dispatches addPatient on submit in create mode', async () => {
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
    cmp.onSubmit();
    expect(spy).toHaveBeenCalled();
    const dispatched = spy.mock.calls[0][0] as unknown as { type: string; req: { firstName: string; lastName: string; dni: string; birthDate: string | null } };
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
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const patient = {
      id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE' as const, sexAtBirth: 'FEMALE' as const,
      status: 'COMPLETE' as const, contacts: [], addresses: [], coverages: [], active: true,
    };
    actions$.next(addPatientSuccess({ patient }));
    expect(navSpy).toHaveBeenCalledWith(['/pacientes']);
  });

  it('navigates to /pacientes after updatePatientSuccess', async () => {
    const { updatePatientSuccess } = await import('../../store/patient.actions');
    const { Router } = await import('@angular/router');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const patient = {
      id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE' as const, sexAtBirth: 'FEMALE' as const,
      status: 'COMPLETE' as const, contacts: [], addresses: [], coverages: [], active: true,
    };
    actions$.next(updatePatientSuccess({ patient }));
    expect(navSpy).toHaveBeenCalledWith(['/pacientes']);
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
});
