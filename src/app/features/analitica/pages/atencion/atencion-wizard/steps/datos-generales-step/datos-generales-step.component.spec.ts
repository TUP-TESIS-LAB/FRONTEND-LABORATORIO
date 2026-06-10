import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DatosGeneralesStepComponent } from './datos-generales-step.component';
import { initialAtencionState, ATENCION_FEATURE_KEY } from '../../../../../store/atencion/atencion.state';
import {
  resolvePatientByDni,
  loadAttentionPatient,
  startAttentionForPatient,
  assignGeneralData,
  createPatientInline,
  updatePatientInline,
  verifyPatient,
} from '../../../../../store/atencion/atencion.actions';
import { CoveragePlansService } from '@features/pacientes/services/coverage-plans.service';
import { DoctorService } from '@features/medicos/services/doctor.service';
import { NotificationService } from '@core/services/notification.service';

const STUB_PLANS = [{ planId: 1, label: 'Particular', particular: true }];

const coveragePlansStub = {
  getActivePlans: () => of(STUB_PLANS),
};

const doctorServiceStub = {
  list: () => of([]),
  quickCreate: vi.fn(),
};

const notificationStub = {
  error: vi.fn(),
  success: vi.fn(),
};

const defaultRouteStub = {
  snapshot: { queryParamMap: { get: () => null } },
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
        { provide: DoctorService, useValue: doctorServiceStub },
        { provide: NotificationService, useValue: notificationStub },
        { provide: ActivatedRoute, useValue: defaultRouteStub },
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

  it('al retomar (sin DNI pero con initialPatientId) hidrata el paciente por id', () => {
    // Reproduce el bug: volver al paso 1 desde análisis no traía un DNI por query param,
    // así que la tarjeta del paciente quedaba vacía. Ahora se rehidrata por patientId.
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.componentRef.setInput('initialDni', null);
    fixture.componentRef.setInput('initialPatientId', 42);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadAttentionPatient({ patientId: 42 }));
  });

  it('con initialDni presente NO hidrata por id (el DNI tiene prioridad)', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.componentRef.setInput('initialDni', '18901234');
    fixture.componentRef.setInput('initialPatientId', 42);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(resolvePatientByDni({ dni: '18901234' }));
    expect(spy).not.toHaveBeenCalledWith(loadAttentionPatient({ patientId: 42 }));
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
      startAttentionForPatient({ patientId: 5, doctorId: null, indications: null, queueEntryId: null }),
    );
  });

  it('NEW-B1: Enter en el input de DNI dispara buscar() y despacha resolvePatientByDni', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    (fixture.componentInstance as any).dniInput = '20304050';
    const spy = vi.spyOn(store, 'dispatch');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[placeholder="Sin puntos ni guiones"]');
    expect(input).toBeTruthy();
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(resolvePatientByDni({ dni: '20304050' }));
  });

  it('NEW-E: en readOnly no se renderiza el botón "Buscar" ni "Confirmar y seguir"', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b: any) => b.textContent ?? '');
    expect(labels.some((l: string) => l.includes('Buscar'))).toBe(false);
    expect(labels.some((l: string) => l.includes('Confirmar y seguir'))).toBe(false);
  });

  it('NEW-E: buscar() es no-op en readOnly', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();
    (fixture.componentInstance as any).dniInput = '123';
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.buscar();
    expect(spy).not.toHaveBeenCalledWith(resolvePatientByDni({ dni: '123' }));
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

  // ── 003: hidratación de indicaciones al retomar ──────────────────────────

  it('hidrata indications desde initialIndications al retomar (003)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.componentRef.setInput('initialIndications', 'Ayuno 8 horas');
    fixture.detectChanges();
    expect((fixture.componentInstance as any).indications).toBe('Ayuno 8 horas');
  });

  it('onConfirm con atencionId incluye las indicaciones hidratadas en assignGeneralData (003)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.componentRef.setInput('initialIndications', 'Ayuno 8 horas');
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
        payload: { patientId: 5, doctorId: null, insurancePlanId: null, indications: 'Ayuno 8 horas' },
      }),
    );
  });

  // ── 007: médico solicitante ──────────────────────────────────────────────

  it('hidrata el médico seleccionado desde initialDoctorId (007)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.componentRef.setInput('initialDoctorId', 42);
    fixture.detectChanges();
    expect((fixture.componentInstance as any).selectedDoctorId()).toBe(42);
  });

  it('onConfirm incluye el doctorId seleccionado en assignGeneralData (007)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: { id: 5 } as any },
    });
    store.refreshState();
    fixture.detectChanges();
    (fixture.componentInstance as any).selectedDoctorId.set(99);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onConfirm();
    expect(spy).toHaveBeenCalledWith(
      assignGeneralData({
        id: 7,
        payload: { patientId: 5, doctorId: 99, insurancePlanId: null, indications: null },
      }),
    );
  });

  it('altaMedicoValida exige nombre (≥2 palabras) + matrícula', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.doctorForm = { fullName: 'Juan', tuition: '123' };
    expect(c.altaMedicoValida()).toBe(false); // una sola palabra
    c.doctorForm = { fullName: 'Juan Pérez', tuition: '' };
    expect(c.altaMedicoValida()).toBe(false); // sin matrícula
    c.doctorForm = { fullName: 'Juan Pérez', tuition: '12345' };
    expect(c.altaMedicoValida()).toBe(true);
  });

  it('crearMedico parte el nombre completo, llama quickCreate y selecciona el médico creado (007)', () => {
    const created = { id: 55, firstName: 'Juan', lastName: 'Pérez García', tuition: '12345', active: true } as any;
    doctorServiceStub.quickCreate.mockReturnValue(of(created));
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.addingDoctor.set(true);
    c.doctorForm = { fullName: 'Juan Pérez García', tuition: '12345' };
    c.crearMedico();
    expect(doctorServiceStub.quickCreate).toHaveBeenCalledWith({
      firstName: 'Juan', lastName: 'Pérez García', tuition: '12345',
    });
    expect(c.selectedDoctorId()).toBe(55);
    expect(c.addingDoctor()).toBe(false);
    expect(c.doctors().some((d: any) => d.id === 55)).toBe(true);
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

describe('DatosGeneralesStepComponent — queueEntryId from route', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosGeneralesStepComponent],
      providers: [
        provideMockStore({
          initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState },
        }),
        { provide: CoveragePlansService, useValue: coveragePlansStub },
        { provide: DoctorService, useValue: doctorServiceStub },
        { provide: NotificationService, useValue: notificationStub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: (k: string) => k === 'queueEntryId' ? '99' : null } } },
        },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('confirmar con queueEntryId en la ruta lo incluye en startAttentionForPatient', () => {
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
      startAttentionForPatient({ patientId: 5, doctorId: null, indications: null, queueEntryId: 99 }),
    );
  });
});
