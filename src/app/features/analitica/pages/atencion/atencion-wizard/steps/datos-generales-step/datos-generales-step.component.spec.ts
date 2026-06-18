import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DatosGeneralesStepComponent } from './datos-generales-step.component';
import { initialAtencionState, ATENCION_FEATURE_KEY } from '../../../../../store/atencion/atencion.state';
import {
  resolvePatientByDni,
  loadAttentionPatient,
  loadPatientGuardians,
  startAttentionForPatient,
  assignGeneralData,
  createPatientInline,
  updatePatientInline,
  validateBond,
  verifyPatient,
} from '../../../../../store/atencion/atencion.actions';
import { createPatientPortalAccount } from '../../../../../../pacientes/store/patient.actions';
import { PatientGuardian } from '../../../../../models/patient-guardian.model';
import { CoverageCatalogService } from '@features/pacientes/services/coverage-catalog.service';
import { DoctorService } from '@features/medicos/services/doctor.service';
import { NotificationService } from '@core/services/notification.service';

const STUB_CATALOG = {
  insurers: [
    { id: 96001, name: 'Particular', insurerType: 'SELF_PAY' as const },
    { id: 96002, name: 'OSDE', insurerType: 'PRIVATE' as const },
  ],
  plans: [
    { planId: 96001, insurerId: 96001, name: 'Plan Particular', particular: true },
    { planId: 96002, insurerId: 96002, name: '210', particular: false },
  ],
};

const coverageCatalogStub = {
  getCatalog: () => of(STUB_CATALOG),
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
        { provide: CoverageCatalogService, useValue: coverageCatalogStub },
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
      startAttentionForPatient({ patientId: 5, doctorId: null, insurancePlanId: null, indications: null, queueEntryId: null }),
    );
  });

  it('cobertura: default = principal activa; cambiar el chip cambia el insurancePlanId enviado', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: {
        id: 5, coverages: [
          { planId: 20, memberNumber: '6012345', isPrimary: true, active: true },
          { planId: 21, memberNumber: 'x', isPrimary: false, active: true },
        ],
      } as any },
    });
    store.refreshState();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      selectedInsurancePlanId: { (): number | null; set(v: number | null): void };
      coverageChips(): { planId: number | null }[];
      onConfirm(): void;
    };
    // Chips: Particular (null) + las 2 coberturas activas.
    expect(cmp.coverageChips().map((c) => c.planId)).toEqual([null, 20, 21]);
    // Default: la principal activa (20).
    expect(cmp.selectedInsurancePlanId()).toBe(20);
    // El operador cambia a la otra cobertura → se manda ese plan.
    cmp.selectedInsurancePlanId.set(21);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onConfirm();
    expect(spy).toHaveBeenCalledWith(
      startAttentionForPatient({ patientId: 5, doctorId: null, insurancePlanId: 21, indications: null, queueEntryId: null }),
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
    (fixture.componentInstance as any).dniInput = '23232323';
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.buscar();
    expect(spy).toHaveBeenCalledWith(resolvePatientByDni({ dni: '23232323' }));
  });

  it('buscar() ignora DNIs de menos de 7 dígitos (no despacha)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    (fixture.componentInstance as any).dniInput = '123';
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.buscar();
    expect(spy).not.toHaveBeenCalledWith(resolvePatientByDni({ dni: '123' }));
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

  it('crearPaciente() con todos los campos despacha createPatientInline (cobertura Particular)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges(); // default: Particular (96001)
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState } });
    store.refreshState();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.form = {
      dni: '12345678',
      firstName: 'Juan',
      lastName: 'Perez',
      birthDate: '1990-01-01',
      gender: 'MALE',
      sexAtBirth: 'MALE',
      planId: 96001,
      memberNumber: '',
    };
    cmp.formInsurerId.set(96001);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.crearPaciente();
    expect(spy).toHaveBeenCalledWith(
      createPatientInline({
        payload: {
          dni: '12345678',
          firstName: 'Juan',
          lastName: 'Perez',
          birthDate: '1990-01-01',
          gender: 'MALE',
          sexAtBirth: 'MALE',
          contacts: [],
          addresses: [],
          coverages: [{ planId: 96001, memberNumber: '', isPrimary: true, active: true }],
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

  // ── altaValida: todos los campos obligatorios (plan/N° afiliado salvo Particular) ──

  function fullAltaForm(over: Record<string, unknown> = {}) {
    return {
      dni: '99887766', firstName: 'Ana', lastName: 'Gomez',
      birthDate: '1990-05-01', gender: 'FEMALE', sexAtBirth: 'FEMALE',
      planId: 96001, memberNumber: '', ...over,
    };
  }

  it('altaValida() true con todos los campos; Particular no exige N° de afiliado', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges(); // default: Particular (96001) + Plan Particular
    const cmp = fixture.componentInstance as any;
    cmp.form = fullAltaForm();
    cmp.formInsurerId.set(96001); // Particular
    expect(cmp.altaValida()).toBe(true);
  });

  it('altaValida() false si falta fecha, género, sexo u obra social', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.formInsurerId.set(96001);
    cmp.form = fullAltaForm({ birthDate: '' });
    expect(cmp.altaValida()).toBe(false);
    cmp.form = fullAltaForm({ gender: null });
    expect(cmp.altaValida()).toBe(false);
    cmp.form = fullAltaForm({ sexAtBirth: null });
    expect(cmp.altaValida()).toBe(false);
    cmp.form = fullAltaForm();
    cmp.formInsurerId.set(null); // sin obra social
    expect(cmp.altaValida()).toBe(false);
  });

  it('altaValida() con obra social NO Particular exige N° de afiliado', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.onFormInsurerChange(96002); // OSDE → plan 96002 auto-seleccionado
    cmp.form = fullAltaForm({ planId: 96002, memberNumber: '' });
    expect(cmp.altaValida()).toBe(false);        // falta N° afiliado
    cmp.form = fullAltaForm({ planId: 96002, memberNumber: 'AF-1' });
    expect(cmp.altaValida()).toBe(true);
  });

  it('altaValida() false con fecha futura o año de más de 4 dígitos', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.formInsurerId.set(96001);
    cmp.form = fullAltaForm({ birthDate: '2999-01-01' }); // futura
    expect(cmp.altaValida()).toBe(false);
    cmp.form = fullAltaForm({ birthDate: '12345-01-01' }); // año 5 dígitos
    expect(cmp.altaValida()).toBe(false);
  });

  // ── New tests: coverage dropdown ─────────────────────────────────────────

  it('cascada cobertura: obras sociales del catálogo + default Particular en ngOnInit', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    // El dropdown de obra social ofrece todas las del catálogo (incluye Particular)
    expect(cmp.insurerOptions().map((i: any) => i.name)).toEqual(['Particular', 'OSDE']);
    // Default: Particular preseleccionada (obra social + plan)
    expect(cmp.formInsurerId()).toBe(96001);
    expect(cmp.form.planId).toBe(96001);
  });

  it('cascada cobertura: al elegir una obra social filtra sus planes y resetea el plan', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.onFormInsurerChange(96002); // OSDE → un solo plan (210) → auto-selecciona
    expect(cmp.formPlanOptions().map((p: any) => p.name)).toEqual(['210']);
    expect(cmp.form.planId).toBe(96002);
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
    const cmp = fixture.componentInstance as any;
    cmp.form = {
      dni: '55554444', firstName: 'Luis', lastName: 'Rios',
      birthDate: '1985-03-10', gender: 'MALE', sexAtBirth: 'MALE',
      planId: 96002, memberNumber: 'AF-001',
    };
    cmp.formInsurerId.set(96002); // OSDE (no Particular) → N° afiliado requerido y usado
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.crearPaciente();
    expect(spy).toHaveBeenCalledWith(
      createPatientInline({
        payload: expect.objectContaining({
          coverages: [{ planId: 96002, memberNumber: 'AF-001', isPrimary: true, active: true }],
        }),
      }),
    );
  });

  // ── L2: banner de relación no validada ───────────────────────────────────

  const GUARDIAN_STUB: PatientGuardian = {
    userPatientId: 55,
    titularNombre: 'María García',
    titularDni: '20304050',
    bond: 'HIJO',
    status: 'CREATED',
  };

  it('L2: validarRelacion() despacha validateBond con status VERIFIED', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    (fixture.componentInstance as any).validarRelacion(GUARDIAN_STUB);
    expect(spy).toHaveBeenCalledWith(
      validateBond({ userPatientId: 55, status: 'VERIFIED' }),
    );
  });

  it('L2: rechazarRelacion() despacha validateBond con status REJECTED', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    (fixture.componentInstance as any).rechazarRelacion(GUARDIAN_STUB);
    expect(spy).toHaveBeenCalledWith(
      validateBond({ userPatientId: 55, status: 'REJECTED' }),
    );
  });

  it('L2: effect despacha loadPatientGuardians cuando aparece un paciente resuelto', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: { id: 77, dni: '77777777', firstName: 'Test', lastName: 'User', coverages: [], contacts: [], addresses: [] } as any,
      },
    });
    store.refreshState();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadPatientGuardians({ patientId: 77 }));
  });

  it('L2: effect NO despacha loadPatientGuardians si el paciente ya fue cargado (mismo id)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: { id: 88, dni: '88888888', firstName: 'Test', lastName: 'User', coverages: [], contacts: [], addresses: [] } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    // Reset spy and trigger detectChanges again with same patient id
    const spy = vi.spyOn(store, 'dispatch');
    store.refreshState();
    fixture.detectChanges();
    expect(spy).not.toHaveBeenCalledWith(loadPatientGuardians({ patientId: 88 }));
  });

  it('L2: banner se renderiza cuando pendingGuardian tiene status CREATED', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: { id: 99, dni: '99999999', firstName: 'Dep', lastName: 'Paciente', coverages: [], contacts: [], addresses: [] } as any,
        guardians: [GUARDIAN_STUB],
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('[data-testid="banner-relacion-pendiente"]');
    expect(banner).toBeTruthy();
  });

  it('L2: banner NO se renderiza cuando no hay guardian pendiente', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: { id: 100, dni: '10000000', firstName: 'Ok', lastName: 'Paciente', coverages: [], contacts: [], addresses: [] } as any,
        guardians: [],
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('[data-testid="banner-relacion-pendiente"]');
    expect(banner).toBeNull();
  });

  // ── A7: "Crear acceso al portal" ─────────────────────────────────────────

  const PATIENT_WITH_EMAIL = {
    id: 200,
    dni: '20000000',
    firstName: 'Ana',
    lastName: 'López',
    verifiedAt: null,
    source: 'STAFF',
    coverages: [],
    contacts: [{ contactType: 'EMAIL', contactValue: 'ana@example.com', isPrimary: true, active: true }],
    addresses: [],
    accountStatus: 'NONE',
  } as any;

  const PATIENT_NO_EMAIL = {
    ...PATIENT_WITH_EMAIL,
    id: 201,
    contacts: [],
    accountStatus: 'NONE',
  } as any;

  it('A7: btn-crear-acceso visible cuando accountStatus=NONE + email activo + no readOnly', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: PATIENT_WITH_EMAIL } });
    store.refreshState();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-crear-acceso"]');
    expect(btn).toBeTruthy();
  });

  it('A7: click en btn-crear-acceso despacha createPatientPortalAccount con el id del paciente', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: PATIENT_WITH_EMAIL } });
    store.refreshState();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance['crearAccesoPortal']();
    expect(spy).toHaveBeenCalledWith(createPatientPortalAccount({ id: 200 }));
  });

  it('A7: btn-crear-acceso oculto cuando no hay email activo → muestra acceso-sin-email', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: PATIENT_NO_EMAIL } });
    store.refreshState();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-crear-acceso"]');
    expect(btn).toBeNull();
    const hint = fixture.nativeElement.querySelector('[data-testid="acceso-sin-email"]');
    expect(hint).toBeTruthy();
  });

  it('A7: btn-crear-acceso oculto si accountStatus !== NONE (ya PENDING)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: { ...PATIENT_WITH_EMAIL, accountStatus: 'PENDING' },
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-crear-acceso"]');
    expect(btn).toBeNull();
  });

  it('A7: btn-crear-acceso oculto si readOnly=true', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: PATIENT_WITH_EMAIL } });
    store.refreshState();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-crear-acceso"]');
    expect(btn).toBeNull();
  });

  it('A7: muestra estado-acceso-pendiente cuando accountStatus=PENDING', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: { ...PATIENT_WITH_EMAIL, accountStatus: 'PENDING' },
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="estado-acceso-pendiente"]');
    expect(el).toBeTruthy();
  });

  it('A7: muestra estado-acceso-activo cuando accountStatus=ACTIVE', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: { ...PATIENT_WITH_EMAIL, accountStatus: 'ACTIVE' },
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="estado-acceso-activo"]');
    expect(el).toBeTruthy();
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
        { provide: CoverageCatalogService, useValue: coverageCatalogStub },
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
      startAttentionForPatient({ patientId: 5, doctorId: null, insurancePlanId: null, indications: null, queueEntryId: 99 }),
    );
  });
});
