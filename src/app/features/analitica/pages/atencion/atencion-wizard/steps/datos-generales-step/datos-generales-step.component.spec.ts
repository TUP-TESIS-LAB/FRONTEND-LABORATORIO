import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService } from 'primeng/api';
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
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { PatientService } from '@features/pacientes/services/patient.service';
import { setUrgentFlag } from '../../../../../store/atencion/atencion.actions';

const STUB_CATALOG = {
  insurers: [
    { id: 96002, name: 'OSDE', insurerType: 'PRIVATE' as const },
  ],
  plans: [
    { planId: 96002, insurerId: 96002, name: '210' },
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

/** ModuleRegistry stub: por defecto PORTAL activo, URGENCIAS inactivo (para no romper tests L2 existentes). */
const makeModuleRegistryStub = (portalActive = true, urgenciasActive = false) => ({
  isActive: (key: ModuleKey) => {
    if (key === ModuleKey.Portal) return portalActive;
    if (key === ModuleKey.Urgencias) return urgenciasActive;
    return false;
  },
});

/** PatientService stub: requerido por PortalAccessDialogComponent (importado en el componente). */
const patientServiceStub = {
  existsByDni: vi.fn().mockReturnValue(of(false)),
  getByDni: vi.fn(),
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
        { provide: ModuleRegistry, useValue: makeModuleRegistryStub(true) },
        { provide: PatientService, useValue: patientServiceStub },
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
      startAttentionForPatient({ patientId: 5, doctorId: null, insurancePlanId: null, indications: null, queueEntryId: null, isUrgent: false }),
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
      startAttentionForPatient({ patientId: 5, doctorId: null, insurancePlanId: 21, indications: null, queueEntryId: null, isUrgent: false }),
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
    fixture.detectChanges(); // default: Particular (sin obra social)
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
      planId: null,
      memberNumber: '',
    };
    cmp.formInsurerId.set(null);
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

  it('hint-falta-verificar visible para paciente STAFF sin verificar (no solo portal) e indica qué falta', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 12, dni: '12', firstName: 'A', lastName: 'B',
          birthDate: '1990-01-01', gender: 'MALE', sexAtBirth: 'MALE',
          verifiedAt: null, source: 'STAFF',
          coverages: [], contacts: [], addresses: [],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const hint = fixture.nativeElement.querySelector('[data-testid="hint-falta-verificar"]');
    expect(hint).toBeTruthy();
    expect(hint.textContent).toContain('Falta una cobertura activa');
  });

  // ── altaValida: todos los campos obligatorios (plan/N° afiliado salvo Particular) ──

  function fullAltaForm(over: Record<string, unknown> = {}) {
    return {
      dni: '99887766', firstName: 'Ana', lastName: 'Gomez',
      birthDate: '1990-05-01', gender: 'FEMALE', sexAtBirth: 'FEMALE',
      planId: null, memberNumber: '', ...over,
    };
  }

  it('altaValida() true con todos los campos; Particular no exige N° de afiliado', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges(); // default: Particular (sin obra social)
    const cmp = fixture.componentInstance as any;
    cmp.form = fullAltaForm();
    cmp.formInsurerId.set(null); // Particular
    expect(cmp.altaValida()).toBe(true);
  });

  it('altaValida() false si falta fecha, género, sexo u obra social', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.formInsurerId.set(null); // Particular (cobertura es opcional)
    cmp.form = fullAltaForm({ birthDate: '' });
    expect(cmp.altaValida()).toBe(false);
    cmp.form = fullAltaForm({ gender: null });
    expect(cmp.altaValida()).toBe(false);
    cmp.form = fullAltaForm({ sexAtBirth: null });
    expect(cmp.altaValida()).toBe(false);
    // Cobertura opcional: sin obra social (Particular) SÍ es válido con el resto completo.
    cmp.form = fullAltaForm();
    cmp.formInsurerId.set(null);
    expect(cmp.altaValida()).toBe(true);
    // Pero si se elige una obra social, el plan pasa a ser obligatorio.
    cmp.form = fullAltaForm({ planId: null });
    cmp.formInsurerId.set(96002); // OSDE elegida, sin plan
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
    // El dropdown de obra social ofrece todas las obras sociales reales del catálogo
    // (Particular ya no es una fila del catálogo: es dejar la obra social vacía).
    expect(cmp.insurerOptions().map((i: any) => i.name)).toEqual(['OSDE']);
    // Default: Particular (sin obra social, sin plan).
    expect(cmp.formInsurerId()).toBeNull();
    expect(cmp.form.planId).toBeNull();
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

  it('2B: con responsable VERIFIED muestra "Gestionado por" y oculta btn-crear-acceso', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: PATIENT_NO_EMAIL,
        guardians: [{ userPatientId: 7, titularNombre: 'Carlos García', titularDni: '30123456', bond: 'PADRE', status: 'VERIFIED' }],
      },
    });
    store.refreshState();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="btn-crear-acceso"]')).toBeNull();
    const gestionado = fixture.nativeElement.querySelector('[data-testid="estado-gestionado-por"]');
    expect(gestionado).toBeTruthy();
    expect(gestionado.textContent).toContain('Carlos García');
  });

  it('A7→2B: click en btn-crear-acceso abre el diálogo (portalDialogVisible true), NO despacha directo', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: PATIENT_WITH_EMAIL } });
    store.refreshState();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance['crearAccesoPortal']();
    // Must NOT dispatch the old direct action
    expect(spy).not.toHaveBeenCalledWith(createPatientPortalAccount({ id: 200 }));
    // Must open the dialog
    expect((fixture.componentInstance as any).portalDialogVisible()).toBe(true);
  });

  it('2B: btn-crear-acceso visible cuando accountStatus=NONE + no readOnly (SIN email también)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: PATIENT_NO_EMAIL } });
    store.refreshState();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-crear-acceso"]');
    expect(btn).toBeTruthy();
  });

  it('2B: lab-portal-access-dialog recibe [patientId] del paciente resuelto', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: PATIENT_WITH_EMAIL } });
    store.refreshState();
    fixture.detectChanges();
    // Open the dialog
    (fixture.componentInstance as any).crearAccesoPortal();
    fixture.detectChanges();
    // The dialog element should be in the DOM
    const dialog = fixture.nativeElement.querySelector('lab-portal-access-dialog');
    expect(dialog).toBeTruthy();
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
        { provide: ModuleRegistry, useValue: makeModuleRegistryStub(true) },
        { provide: PatientService, useValue: patientServiceStub },
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
      startAttentionForPatient({ patientId: 5, doctorId: null, insurancePlanId: null, indications: null, queueEntryId: 99, isUrgent: false }),
    );
  });
});

// ── B2: gatear banner de relación por ModuleKey.Portal ───────────────────────

const GUARDIAN_STUB_B2: PatientGuardian = {
  userPatientId: 55,
  titularNombre: 'María García',
  titularDni: '20304050',
  bond: 'HIJO',
  status: 'CREATED',
};

const PATIENT_WITH_GUARDIAN_STATE = {
  [ATENCION_FEATURE_KEY]: {
    ...initialAtencionState,
    resolvedPatient: {
      id: 99, dni: '99999999', firstName: 'Dep', lastName: 'Paciente',
      coverages: [], contacts: [], addresses: [],
    } as any,
    guardians: [GUARDIAN_STUB_B2],
  },
};

describe('DatosGeneralesStepComponent — B2: banner relacion gateado por PORTAL (activo)', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosGeneralesStepComponent],
      providers: [
        provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState } }),
        { provide: CoverageCatalogService, useValue: coverageCatalogStub },
        { provide: DoctorService, useValue: doctorServiceStub },
        { provide: NotificationService, useValue: notificationStub },
        { provide: ActivatedRoute, useValue: defaultRouteStub },
        { provide: ModuleRegistry, useValue: makeModuleRegistryStub(true) },
        { provide: PatientService, useValue: patientServiceStub },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('B2: banner-relacion-pendiente se renderiza cuando PORTAL activo + pendingGuardian', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState(PATIENT_WITH_GUARDIAN_STATE);
    store.refreshState();
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('[data-testid="banner-relacion-pendiente"]');
    expect(banner).toBeTruthy();
  });
});

describe('DatosGeneralesStepComponent — B2: banner relacion gateado por PORTAL (inactivo)', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosGeneralesStepComponent],
      providers: [
        provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState } }),
        { provide: CoverageCatalogService, useValue: coverageCatalogStub },
        { provide: DoctorService, useValue: doctorServiceStub },
        { provide: NotificationService, useValue: notificationStub },
        { provide: ActivatedRoute, useValue: defaultRouteStub },
        { provide: ModuleRegistry, useValue: makeModuleRegistryStub(false) },
        { provide: PatientService, useValue: patientServiceStub },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('B2: banner-relacion-pendiente NO se renderiza cuando PORTAL inactivo (aunque haya guardian pendiente)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState(PATIENT_WITH_GUARDIAN_STATE);
    store.refreshState();
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('[data-testid="banner-relacion-pendiente"]');
    expect(banner).toBeNull();
  });

  it('btn-crear-acceso NO se renderiza cuando PORTAL inactivo (aunque accountStatus=NONE + email)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 99, dni: '99999999', firstName: 'Dep', lastName: 'Paciente',
          accountStatus: 'NONE', coverages: [], addresses: [],
          contacts: [{ contactType: 'EMAIL', contactValue: 'dep@mail.com', active: true }],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-crear-acceso"]');
    expect(btn).toBeNull();
  });
});

// ── KAN-140: toggle urgente gateado por ModuleKey.Urgencias ─────────────────

describe('DatosGeneralesStepComponent — urgente toggle (URGENCIAS inactivo)', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosGeneralesStepComponent],
      providers: [
        provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState } }),
        { provide: CoverageCatalogService, useValue: coverageCatalogStub },
        { provide: DoctorService, useValue: doctorServiceStub },
        { provide: NotificationService, useValue: notificationStub },
        { provide: ActivatedRoute, useValue: defaultRouteStub },
        { provide: ModuleRegistry, useValue: makeModuleRegistryStub(true, false) },
        { provide: PatientService, useValue: patientServiceStub },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('toggle urgente NO se renderiza cuando URGENCIAS está inactivo', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.componentRef.setInput('readOnly', false);
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('[data-testid="urgente-toggle-container"]');
    expect(container).toBeNull();
  });

});

describe('DatosGeneralesStepComponent — urgente toggle (URGENCIAS activo)', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosGeneralesStepComponent],
      providers: [
        provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState } }),
        provideNoopAnimations(),
        { provide: CoverageCatalogService, useValue: coverageCatalogStub },
        { provide: DoctorService, useValue: doctorServiceStub },
        { provide: NotificationService, useValue: notificationStub },
        { provide: ActivatedRoute, useValue: defaultRouteStub },
        { provide: ModuleRegistry, useValue: makeModuleRegistryStub(true, true) },
        { provide: PatientService, useValue: patientServiceStub },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('toggle urgente SE renderiza cuando URGENCIAS activo y readOnly=false (default)', () => {
    // readOnly defaults to false — no setInput needed
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('[data-testid="urgente-toggle-container"]');
    expect(container).toBeTruthy();
  });

  it('urgenciasActive() retorna true cuando el módulo URGENCIAS está activo', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.detectChanges();
    expect((fixture.componentInstance as any).urgenciasActive()).toBe(true);
  });

  /** Espía `confirm.confirm` sin dejar que dispare el diálogo real; captura accept/reject. */
  function stubConfirm(fixture: any): { accept?: () => void; reject?: () => void } {
    const confirm = fixture.debugElement.injector.get(ConfirmationService);
    const captured: { accept?: () => void; reject?: () => void } = {};
    vi.spyOn(confirm, 'confirm').mockImplementation((opts: any) => {
      captured.accept = opts.accept;
      captured.reject = opts.reject;
      return confirm;
    });
    return captured;
  }

  it('onUrgentChange() al ACTIVAR muestra el modal informativo y NO despacha hasta confirmar (KAN-237)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.detectChanges();
    // Parchear el signal atencionId para que devuelva 7 (simula atención ya creada)
    const cmp = fixture.componentInstance as any;
    vi.spyOn(cmp, 'atencionId').mockReturnValue(7);
    const confirmed = stubConfirm(fixture);
    const spy = vi.spyOn(store, 'dispatch');
    spy.mockClear();
    cmp.isUrgentValue = true;
    cmp.onUrgentChange();
    expect(confirmed.accept).toBeDefined();
    expect(spy).not.toHaveBeenCalledWith(setUrgentFlag({ id: 7, isUrgent: true }));
    // El operador confirma → recién ahí se despacha.
    confirmed.accept!();
    expect(spy).toHaveBeenCalledWith(setUrgentFlag({ id: 7, isUrgent: true }));
  });

  it('onUrgentChange() al ACTIVAR y CANCELAR el modal revierte el toggle y no despacha nada (KAN-237)', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    vi.spyOn(cmp, 'atencionId').mockReturnValue(7);
    const confirmed = stubConfirm(fixture);
    const spy = vi.spyOn(store, 'dispatch');
    spy.mockClear();
    cmp.isUrgentValue = true;
    cmp.onUrgentChange();
    confirmed.reject!();
    expect(cmp.isUrgentValue).toBe(false);
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: '[Atencion Wizard] Set Urgent Flag' }));
  });

  it('onUrgentChange() al DESACTIVAR no muestra modal y despacha directo', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    vi.spyOn(cmp, 'atencionId').mockReturnValue(7);
    const confirmService = fixture.debugElement.injector.get(ConfirmationService);
    const confirmSpy = vi.spyOn(confirmService, 'confirm');
    const spy = vi.spyOn(store, 'dispatch');
    spy.mockClear();
    cmp.isUrgentValue = false;
    cmp.onUrgentChange();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(setUrgentFlag({ id: 7, isUrgent: false }));
  });

  it('onUrgentChange() es no-op si atencionId() retorna null (atención aún no creada), incluso confirmando el modal', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    // Por defecto atencionId es null (input no recibió valor)
    const confirmed = stubConfirm(fixture);
    const spy = vi.spyOn(store, 'dispatch');
    spy.mockClear();
    cmp.isUrgentValue = true;
    cmp.onUrgentChange();
    confirmed.accept!();
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: '[Atencion Wizard] Set Urgent Flag' }));
  });

  it('GAP B (KAN-188): marcar urgente en alta nueva difiere la OS → Particular; desmarcar vuelve a la principal', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: {
        id: 5, coverages: [{ planId: 20, memberNumber: '6012345', isPrimary: true, active: true }],
      } as any },
    });
    store.refreshState();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const confirmed = stubConfirm(fixture);
    // Default para no-urgente = cobertura principal (20).
    expect(cmp.selectedInsurancePlanId()).toBe(20);
    // Marcar urgente → confirma el modal → Particular (null).
    cmp.isUrgentValue = true;
    cmp.onUrgentChange();
    confirmed.accept!();
    expect(cmp.selectedInsurancePlanId()).toBeNull();
    // Desmarcar → sin modal → vuelve a la principal (20).
    cmp.isUrgentValue = false;
    cmp.onUrgentChange();
    expect(cmp.selectedInsurancePlanId()).toBe(20);
  });

  it('GAP A (KAN-188): onConfirm en atención nueva con el toggle urgente ON manda isUrgent:true', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: { id: 5 } as any },
    });
    store.refreshState();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.isUrgentValue = true;
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onConfirm();
    expect(spy).toHaveBeenCalledWith(
      startAttentionForPatient({ patientId: 5, doctorId: null, insurancePlanId: null, indications: null, queueEntryId: null, isUrgent: true }),
    );
  });
});
