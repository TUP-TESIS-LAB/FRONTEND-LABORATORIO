import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { DatosGeneralesStepComponent } from './datos-generales-step.component';
import { initialAtencionState, ATENCION_FEATURE_KEY } from '../../../../../store/atencion/atencion.state';
import {
  resolvePatientByDni,
  startAttentionForPatient,
  assignGeneralData,
  createPatientInline,
  updatePatientInline,
  verifyPatient,
} from '../../../../../store/atencion/atencion.actions';
import { CoveragePlansService } from '@features/pacientes/services/coverage-plans.service';

const STUB_PLANS = [{ planId: 1, label: 'Particular', particular: true }];

const coveragePlansStub = {
  getActivePlans: () => of(STUB_PLANS),
};

describe('DatosGeneralesStepComponent', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosGeneralesStepComponent],
      providers: [
        provideMockStore({
          initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState },
        }),
        { provide: CoveragePlansService, useValue: coveragePlansStub },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('con initialDni despacha resolvePatientByDni al iniciar', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('initialDni', '18901234');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(resolvePatientByDni({ dni: '18901234' }));
  });

  it('confirmar con paciente resuelto y sin atencionId despacha startAttentionForPatient', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: { id: 5 } as any },
    });
    store.refreshState();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onConfirm();
    expect(spy).toHaveBeenCalledWith(
      startAttentionForPatient({ patientId: 5, indications: null }),
    );
  });

  it('buscar() despacha resolvePatientByDni con el dni ingresado', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState } });
    store.refreshState();
    fixture.detectChanges();
    (fixture.componentInstance as any).dniInput = '123';
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.buscar();
    expect(spy).toHaveBeenCalledWith(resolvePatientByDni({ dni: '123' }));
  });

  it('onConfirm() con atencionId despacha assignGeneralData', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: { id: 5 } as any },
    });
    store.refreshState();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onConfirm();
    expect(spy).toHaveBeenCalledWith(
      assignGeneralData({
        id: 7,
        payload: {
          patientId: 5,
          doctorId: null,
          insurancePlanId: null,
          indications: null,
        },
      }),
    );
  });

  it('crearPaciente() con form válido (solo 3 campos) despacha createPatientInline', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState } });
    store.refreshState();
    fixture.detectChanges();
    (fixture.componentInstance as any).form = {
      dni: '12345678',
      firstName: 'Juan',
      lastName: 'Perez',
      birthDate: '',
      gender: null,
      sexAtBirth: null,
      planId: null,
      memberNumber: '',
    };
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.crearPaciente();
    expect(spy).toHaveBeenCalledWith(
      createPatientInline({
        payload: {
          dni: '12345678',
          firstName: 'Juan',
          lastName: 'Perez',
          birthDate: null,
          gender: null,
          sexAtBirth: null,
          contacts: [],
          addresses: [],
          coverages: [],
        },
      }),
    );
  });

  it('crearPaciente() con form incompleto no despacha', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState } });
    store.refreshState();
    fixture.detectChanges();
    // form vacío por defecto
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.crearPaciente();
    expect(spy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Atencion Wizard] Create Patient Inline' }),
    );
  });

  it('saveEdit() despacha updatePatientInline con los datos del form', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 5,
          dni: '1',
          firstName: 'A',
          lastName: 'B',
          birthDate: '2000-01-01',
          gender: 'MALE',
          sexAtBirth: 'MALE',
          contacts: [],
          addresses: [],
          coverages: [],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    fixture.componentInstance.startEdit();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.saveEdit();
    expect(spy).toHaveBeenCalledWith(
      updatePatientInline({
        id: 5,
        payload: {
          firstName: 'A',
          lastName: 'B',
          birthDate: '2000-01-01',
          gender: 'MALE',
          sexAtBirth: 'MALE',
          contacts: [],
          addresses: [],
          coverages: [],
        },
      }),
    );
  });

  it('saveEdit() incluye la cobertura elegida en el payload (paciente de portal sin cobertura)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 5,
          dni: '1',
          firstName: 'A',
          lastName: 'B',
          birthDate: '2000-01-01',
          gender: 'MALE',
          sexAtBirth: 'MALE',
          source: 'PORTAL',
          verifiedAt: null,
          contacts: [],
          addresses: [],
          coverages: [],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    fixture.componentInstance.startEdit();
    // La secretaria elige una cobertura para el paciente de portal que no tenía
    (fixture.componentInstance as any).form.planId = 1;
    (fixture.componentInstance as any).form.memberNumber = 'OS-123';
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.saveEdit();
    expect(spy).toHaveBeenCalledWith(
      updatePatientInline({
        id: 5,
        payload: {
          firstName: 'A',
          lastName: 'B',
          birthDate: '2000-01-01',
          gender: 'MALE',
          sexAtBirth: 'MALE',
          contacts: [],
          addresses: [],
          coverages: [{ planId: 1, memberNumber: 'OS-123', isPrimary: true, active: true }],
        },
      }),
    );
  });

  // ── New tests: 3-state badge ─────────────────────────────────────────────

  it('badge data-estado VERDE cuando el paciente tiene verifiedAt', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 1, dni: '1', firstName: 'A', lastName: 'B',
          verifiedAt: '2025-01-01T00:00:00Z', source: 'STAFF',
          coverages: [], contacts: [], addresses: [],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const badge: HTMLElement = fixture.nativeElement.querySelector('[data-testid="estado-badge"]');
    expect(badge).toBeTruthy();
    expect(badge.getAttribute('data-estado')).toBe('verde');
  });

  it('badge data-estado NARANJA cuando el paciente no tiene verifiedAt', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 2, dni: '2', firstName: 'B', lastName: 'C',
          verifiedAt: null, source: 'STAFF',
          coverages: [], contacts: [], addresses: [],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const badge: HTMLElement = fixture.nativeElement.querySelector('[data-testid="estado-badge"]');
    expect(badge).toBeTruthy();
    expect(badge.getAttribute('data-estado')).toBe('naranja');
  });

  it('badge data-estado ROJO cuando notFoundDni está seteado', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: null,
        patientNotFoundDni: '99999999',
      },
    });
    store.refreshState();
    fixture.detectChanges();
    // With notFoundDni, the estado computed returns 'rojo'.
    // No badge is shown in the resolved block, but we can verify the computed via component instance.
    expect((fixture.componentInstance as any).estado()).toBe('rojo');
  });

  // ── New test: portal tilde ────────────────────────────────────────────────

  it('muestra tilde-portal cuando source === PORTAL', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 3, dni: '3', firstName: 'C', lastName: 'D',
          verifiedAt: null, source: 'PORTAL',
          coverages: [], contacts: [], addresses: [],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const tilde = fixture.nativeElement.querySelector('[data-testid="tilde-portal"]');
    expect(tilde).toBeTruthy();
  });

  it('no muestra tilde-portal cuando source === STAFF', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 4, dni: '4', firstName: 'D', lastName: 'E',
          verifiedAt: null, source: 'STAFF',
          coverages: [], contacts: [], addresses: [],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const tilde = fixture.nativeElement.querySelector('[data-testid="tilde-portal"]');
    expect(tilde).toBeNull();
  });

  // ── New tests: btn-verificar ──────────────────────────────────────────────

  it('btn-verificar despacha verifyPatient con el id del paciente', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 10, dni: '10', firstName: 'A', lastName: 'B',
          birthDate: '1990-01-01', gender: 'MALE', sexAtBirth: 'MALE',
          verifiedAt: null, source: 'STAFF',
          coverages: [{ planId: 1, memberNumber: '', isPrimary: true, active: true }],
          contacts: [], addresses: [],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.marcarVerificado();
    expect(spy).toHaveBeenCalledWith(verifyPatient({ id: 10 }));
  });

  it('btn-verificar puedeVerificar es false cuando falta cobertura activa', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 11, dni: '11', firstName: 'A', lastName: 'B',
          birthDate: '1990-01-01', gender: 'MALE', sexAtBirth: 'MALE',
          verifiedAt: null, source: 'STAFF',
          coverages: [],
          contacts: [], addresses: [],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    expect((fixture.componentInstance as any).puedeVerificar()).toBe(false);
  });

  // ── New tests: altaValida con 3 campos ────────────────────────────────────

  it('altaValida() retorna true con solo dni + firstName + lastName', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    (fixture.componentInstance as any).form = {
      dni: '99887766', firstName: 'Ana', lastName: 'Gomez',
      birthDate: '', gender: null, sexAtBirth: null, planId: null, memberNumber: '',
    };
    expect(fixture.componentInstance.altaValida()).toBe(true);
  });

  it('altaValida() retorna false cuando falta lastName', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    (fixture.componentInstance as any).form = {
      dni: '99887766', firstName: 'Ana', lastName: '',
      birthDate: '', gender: null, sexAtBirth: null, planId: null, memberNumber: '',
    };
    expect(fixture.componentInstance.altaValida()).toBe(false);
  });

  // ── New tests: coverage dropdown ─────────────────────────────────────────

  it('planOptions se carga desde CoveragePlansService en ngOnInit', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const options = (fixture.componentInstance as any).planOptions();
    expect(options).toEqual(STUB_PLANS);
  });

  it('crearPaciente() incluye la cobertura seleccionada en el payload', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState } });
    store.refreshState();
    fixture.detectChanges();
    (fixture.componentInstance as any).form = {
      dni: '55554444', firstName: 'Luis', lastName: 'Rios',
      birthDate: null, gender: null, sexAtBirth: null,
      planId: 1, memberNumber: 'AF-001',
    };
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.crearPaciente();
    expect(spy).toHaveBeenCalledWith(
      createPatientInline({
        payload: expect.objectContaining({
          coverages: [{ planId: 1, memberNumber: 'AF-001', isPrimary: true, active: true }],
        }),
      }),
    );
  });
});
