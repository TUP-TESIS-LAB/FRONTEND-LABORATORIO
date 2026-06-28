import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject, of } from 'rxjs';
import { NuevaVisitaPage } from './nueva-visita.page';
import { selectHomeVisitsPending } from '../../store/home-visit.selectors';
import { DOMICILIO_FEATURE_KEY, initialDomicilioState } from '../../store/home-visit.state';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { EmployeeService } from '@features/sucursales/services/employee.service';
import { PatientService } from '@features/pacientes/services/patient.service';
import { AnalysisService } from '@features/analitica/services/analysis.service';

describe('NuevaVisitaPage (smoke)', () => {
  const mockRouter = { navigate: vi.fn() };
  const mockBranchCtx = { branchId: () => 1, branchName: () => 'Sucursal Demo' };
  const mockEmployeeService = { list: () => of([]) };
  const mockPatientService = {
    search: () => of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 }),
  };
  const mockAnalysisService = {
    searchByName: () => of([]),
    searchByShortCodePrefix: () => of([]),
    findByShortCode: () => of(null),
  };
  let actions$: ReplaySubject<Action>;

  function setup() {
    actions$ = new ReplaySubject<Action>(1);
    TestBed.configureTestingModule({
      imports: [NuevaVisitaPage],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: {
            [DOMICILIO_FEATURE_KEY]: initialDomicilioState,
          },
          selectors: [
            { selector: selectHomeVisitsPending, value: false },
          ],
        }),
        provideMockActions(() => actions$),
        { provide: Router, useValue: mockRouter },
        { provide: OperatorBranchContextService, useValue: mockBranchCtx },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: PatientService, useValue: mockPatientService },
        { provide: AnalysisService, useValue: mockAnalysisService },
      ],
    });
    const fixture = TestBed.createComponent(NuevaVisitaPage);
    return { fixture };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('el componente se crea sin errores', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('empieza en el paso 0 (Paciente y horario)', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance.currentIndex()).toBe(0);
  });

  it('el formulario se crea con los controles requeridos', () => {
    const { fixture } = setup();
    const form = fixture.componentInstance.form;
    expect(form.contains('scheduledAt')).toBe(true);
    expect(form.contains('timeWindowStart')).toBe(true);
    expect(form.contains('timeWindowEnd')).toBe(true);
    expect(form.contains('addressStreet')).toBe(true);
    expect(form.contains('addressCity')).toBe(true);
    expect(form.contains('addressReferences')).toBe(true);
    expect(form.contains('comments')).toBe(true);
  });

  it('step0Valid es false cuando no hay paciente ni fecha ni ventana', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance.step0Valid()).toBe(false);
  });

  it('step0Valid es false cuando solo hay fecha pero no paciente seleccionado', () => {
    const { fixture } = setup();
    fixture.componentInstance.form.patchValue({
      scheduledAt: new Date(),
      timeWindowStart: '08:00',
      timeWindowEnd: '10:00',
    });
    expect(fixture.componentInstance.step0Valid()).toBe(false);
  });

  it('step0Valid es true cuando hay paciente + fecha + ventana horaria completa', () => {
    const { fixture } = setup();
    fixture.componentInstance.onPatientSelected({
      id: 1, dni: '12345678', firstName: 'Ana', lastName: 'García',
      birthDate: null, gender: null, status: 'ACTIVO', contacts: [], addresses: [],
      coverages: [], active: true, accountStatus: 'LINKED',
    } as any);
    fixture.componentInstance.form.patchValue({
      scheduledAt: new Date(),
      timeWindowStart: '08:00',
      timeWindowEnd: '10:00',
    });
    expect(fixture.componentInstance.step0Valid()).toBe(true);
  });

  it('step1Valid es false cuando falta la calle de la dirección', () => {
    const { fixture } = setup();
    fixture.componentInstance.onPatientSelected({
      id: 1, dni: '12345678', firstName: 'Ana', lastName: 'García',
      birthDate: null, gender: null, status: 'ACTIVO', contacts: [], addresses: [],
      coverages: [], active: true, accountStatus: 'LINKED',
    } as any);
    fixture.componentInstance.form.patchValue({
      scheduledAt: new Date(),
      timeWindowStart: '08:00',
      timeWindowEnd: '10:00',
      addressStreet: '',   // falta → inválido
      addressCity: 'La Plata',
    });
    expect(fixture.componentInstance.step1Valid()).toBe(false);
  });

  it('step1Valid es false cuando falta la ciudad', () => {
    const { fixture } = setup();
    fixture.componentInstance.onPatientSelected({
      id: 1, dni: '12345678', firstName: 'Ana', lastName: 'García',
      birthDate: null, gender: null, status: 'ACTIVO', contacts: [], addresses: [],
      coverages: [], active: true, accountStatus: 'LINKED',
    } as any);
    fixture.componentInstance.form.patchValue({
      scheduledAt: new Date(),
      timeWindowStart: '08:00',
      timeWindowEnd: '10:00',
      addressStreet: 'Av. 7',
      addressCity: '',  // falta → inválido
    });
    expect(fixture.componentInstance.step1Valid()).toBe(false);
  });

  it('step1Valid es true cuando todos los campos obligatorios están completos', () => {
    const { fixture } = setup();
    fixture.componentInstance.onPatientSelected({
      id: 1, dni: '12345678', firstName: 'Ana', lastName: 'García',
      birthDate: null, gender: null, status: 'ACTIVO', contacts: [], addresses: [],
      coverages: [], active: true, accountStatus: 'LINKED',
    } as any);
    fixture.componentInstance.form.patchValue({
      scheduledAt: new Date(),
      timeWindowStart: '08:00',
      timeWindowEnd: '10:00',
      addressStreet: 'Av. 7',
      addressCity: 'La Plata',
    });
    expect(fixture.componentInstance.step1Valid()).toBe(true);
  });

  it('cancel() navega a /domicilio/agenda', () => {
    const { fixture } = setup();
    fixture.componentInstance.cancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/domicilio/agenda']);
  });

  it('next() NO avanza al paso 1 si el paso 0 no es válido', () => {
    const { fixture } = setup();
    fixture.componentInstance.next();
    expect(fixture.componentInstance.currentIndex()).toBe(0);
  });

  it('next() avanza al paso 1 cuando el paso 0 es válido', () => {
    const { fixture } = setup();
    fixture.componentInstance.onPatientSelected({
      id: 1, dni: '12345678', firstName: 'Ana', lastName: 'García',
      birthDate: null, gender: null, status: 'ACTIVO', contacts: [], addresses: [],
      coverages: [], active: true, accountStatus: 'LINKED',
    } as any);
    fixture.componentInstance.form.patchValue({
      scheduledAt: new Date(),
      timeWindowStart: '08:00',
      timeWindowEnd: '10:00',
    });
    fixture.componentInstance.next();
    expect(fixture.componentInstance.currentIndex()).toBe(1);
  });

  it('prev() retrocede al paso 0 desde el paso 1', () => {
    const { fixture } = setup();
    fixture.componentInstance.currentIndex.set(1);
    fixture.componentInstance.prev();
    expect(fixture.componentInstance.currentIndex()).toBe(0);
  });

  it('prev() no retrocede más allá del paso 0', () => {
    const { fixture } = setup();
    fixture.componentInstance.currentIndex.set(0);
    fixture.componentInstance.prev();
    expect(fixture.componentInstance.currentIndex()).toBe(0);
  });

  it('goTo() establece el paso directamente', () => {
    const { fixture } = setup();
    fixture.componentInstance.goTo(1);
    expect(fixture.componentInstance.currentIndex()).toBe(1);
  });

  it('onPatientSelected actualiza la señal selectedPatient', () => {
    const { fixture } = setup();
    const patient = {
      id: 42, dni: '99999999', firstName: 'Juan', lastName: 'Pérez',
      birthDate: null, gender: null, status: 'ACTIVO', contacts: [], addresses: [],
      coverages: [], active: true, accountStatus: 'LINKED',
    } as any;
    fixture.componentInstance.onPatientSelected(patient);
    expect(fixture.componentInstance.selectedPatient()?.id).toBe(42);
  });

  it('STEPS tiene 2 pasos con las claves correctas', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance.STEPS.length).toBe(2);
    expect(fixture.componentInstance.STEPS[0].key).toBe('paciente');
    expect(fixture.componentInstance.STEPS[1].key).toBe('direccion');
  });
});
