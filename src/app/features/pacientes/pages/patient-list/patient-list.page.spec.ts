import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { PatientListPage } from './patient-list.page';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';
import {
  setPatientPageRequest,
  createPatientPortalAccount,
  resendPatientPortalAccess,
} from '../../store/patient.actions';
import { PatientPermissionsService } from '../../services/patient-permissions.service';
import { CoveragePlansService } from '../../services/coverage-plans.service';
import { Patient } from '../../models/patient.model';
import { ModuleRegistry } from '@core/tenant/module-registry';

const mockPlansService = {
  getActivePlans: () => of([{ planId: 1, label: 'Particular', particular: true }]),
};

// Default mock: PORTAL active (preserves existing test expectations for portalActions)
const mockRegistryPortalActive = { isActive: vi.fn().mockReturnValue(true) };

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
        {
          provide: ModuleRegistry,
          useValue: mockRegistryPortalActive,
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
      accountStatus: 'NONE' as const,
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

  // ---- A8: portal account actions ----

  const basePatient: Patient = {
    id: 42,
    dni: '30000000',
    firstName: 'Juan',
    lastName: 'Pérez',
    birthDate: '1990-01-01',
    gender: 'MALE',
    sexAtBirth: 'MALE',
    status: 'COMPLETE',
    source: 'STAFF',
    verifiedAt: null,
    contacts: [],
    addresses: [],
    coverages: [],
    active: true,
    accountStatus: 'NONE',
  };

  it('confirmCreateAccount abre confirm y despacha createPatientPortalAccount al aceptar', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const confirmSpy = vi.spyOn(cmp['confirm'], 'confirm');

    cmp['confirmCreateAccount'](basePatient);

    expect(confirmSpy).toHaveBeenCalledOnce();
    const call = confirmSpy.mock.calls[0][0];
    expect(call.header).toBe('¿Crear acceso al portal?');
    call.accept?.();
    expect(dispatchSpy).toHaveBeenCalledWith(createPatientPortalAccount({ id: 42 }));
  });

  it('confirmResendAccess abre confirm y despacha resendPatientPortalAccess al aceptar', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const confirmSpy = vi.spyOn(cmp['confirm'], 'confirm');

    cmp['confirmResendAccess'](basePatient);

    expect(confirmSpy).toHaveBeenCalledOnce();
    const call = confirmSpy.mock.calls[0][0];
    expect(call.header).toBe('¿Reenviar credenciales?');
    call.accept?.();
    expect(dispatchSpy).toHaveBeenCalledWith(resendPatientPortalAccess({ id: 42 }));
  });

  it('onAction rutea create-account → confirmCreateAccount', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    const spy = vi.spyOn(cmp as any, 'confirmCreateAccount');

    cmp.onAction({ key: 'create-account', row: basePatient });

    expect(spy).toHaveBeenCalledWith(basePatient);
  });

  it('onAction rutea resend-access → confirmResendAccess', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    const spy = vi.spyOn(cmp as any, 'confirmResendAccess');

    cmp.onAction({ key: 'resend-access', row: basePatient });

    expect(spy).toHaveBeenCalledWith(basePatient);
  });

  it('createAccountAction.hidden oculta cuando accountStatus≠NONE', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    const cmp = fixture.componentInstance;
    const patientWithEmail: Patient = {
      ...basePatient,
      contacts: [{ contactType: 'EMAIL', contactValue: 'a@b.com', isPrimary: true, active: true }],
    };
    // NONE + email → visible (hidden=false)
    expect(cmp.createAccountAction.hidden!(patientWithEmail)).toBe(false);
    // PENDING + email → hidden
    expect(cmp.createAccountAction.hidden!({ ...patientWithEmail, accountStatus: 'PENDING' })).toBe(true);
    // ACTIVE + email → hidden
    expect(cmp.createAccountAction.hidden!({ ...patientWithEmail, accountStatus: 'ACTIVE' })).toBe(true);
    // NONE + sin email activo → hidden
    expect(cmp.createAccountAction.hidden!({ ...basePatient, contacts: [] })).toBe(true);
    // NONE + email inactivo → hidden
    expect(cmp.createAccountAction.hidden!({
      ...basePatient,
      contacts: [{ contactType: 'EMAIL', contactValue: 'a@b.com', isPrimary: true, active: false }],
    })).toBe(true);
  });

  it('resendAccountAction.hidden visible solo para PENDING', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    const cmp = fixture.componentInstance;
    expect(cmp.resendAccountAction.hidden!({ ...basePatient, accountStatus: 'NONE' })).toBe(true);
    expect(cmp.resendAccountAction.hidden!({ ...basePatient, accountStatus: 'PENDING' })).toBe(false);
    expect(cmp.resendAccountAction.hidden!({ ...basePatient, accountStatus: 'ACTIVE' })).toBe(true);
  });

  // ---- Arco 2B: managedBy ----

  it('accesoPortal cell label: NONE + managedBy(count=1) → "Sin cuenta · Gestionado por Ana Pérez"', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    const cmp = fixture.componentInstance;
    const p: Patient = {
      ...basePatient,
      accountStatus: 'NONE',
      managedBy: { titularNombre: 'Ana Pérez', count: 1 },
    };
    expect(cmp.accesoPortalLabel(p)).toBe('Sin cuenta · Gestionado por Ana Pérez');
  });

  it('accesoPortal cell label: NONE + managedBy(count=2) → "Sin cuenta · Gestionado por Ana Pérez +1"', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    const cmp = fixture.componentInstance;
    const p: Patient = {
      ...basePatient,
      accountStatus: 'NONE',
      managedBy: { titularNombre: 'Ana Pérez', count: 2 },
    };
    expect(cmp.accesoPortalLabel(p)).toBe('Sin cuenta · Gestionado por Ana Pérez +1');
  });

  it('createAccountAction.hidden es true cuando managedBy está presente (no ofrecer cuenta propia)', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    const cmp = fixture.componentInstance;
    const p: Patient = {
      ...basePatient,
      contacts: [{ contactType: 'EMAIL', contactValue: 'a@b.com', isPrimary: true, active: true }],
      managedBy: { titularNombre: 'Ana Pérez', count: 1 },
    };
    expect(cmp.createAccountAction.hidden!(p)).toBe(true);
  });
});

// ---- B3: gating por ModuleKey.Portal ----

function makePortalHarness(portalActive: boolean) {
  const mockRegistry = { isActive: vi.fn().mockReturnValue(portalActive) };
  TestBed.configureTestingModule({
    imports: [PatientListPage],
    providers: [
      provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
      provideRouter([]),
      provideNoopAnimations(),
      { provide: PatientPermissionsService, useValue: { canMutate: signal(true) } },
      { provide: CoveragePlansService, useValue: mockPlansService },
      { provide: ModuleRegistry, useValue: mockRegistry },
    ],
  });
  const fixture = TestBed.createComponent(PatientListPage);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('PatientListPage – gating Portal (B3)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('no expone acciones de portal cuando PORTAL esta inactivo', () => {
    const cmp = makePortalHarness(false);
    expect(cmp.portalActions.length).toBe(0);
  });

  it('expone acciones de portal cuando PORTAL esta activo', () => {
    const cmp = makePortalHarness(true);
    expect(cmp.portalActions.length).toBeGreaterThan(0);
  });

  it('oculta la columna Acceso al portal cuando PORTAL esta inactivo', () => {
    const cmp = makePortalHarness(false);
    expect(cmp.columns.some((c: { field: string }) => c.field === 'accesoPortal')).toBe(false);
  });

  it('muestra la columna Acceso al portal cuando PORTAL esta activo', () => {
    const cmp = makePortalHarness(true);
    expect(cmp.columns.some((c: { field: string }) => c.field === 'accesoPortal')).toBe(true);
  });
});
