/**
 * Tests para NuevaVisitaPage.
 *
 * Diseñados para correr con "ng test" (AOT, @angular/build:unit-test) porque
 * el compilador AOT verifica los bindings del template al compilar — incluyendo
 * que "(finish)" de WizardShellComponent exista y esté correctamente cableado.
 * Si alguien desconecta "(finish)='onFinish()'" del template, el build AOT
 * produciría NG8002 (unknown event), rompiendo la CI.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ReplaySubject, of } from 'rxjs';

import { NuevaVisitaPage } from './nueva-visita.page';
import { selectHomeVisitsPending } from '../../store/home-visit.selectors';
import { DOMICILIO_FEATURE_KEY, initialDomicilioState } from '../../store/home-visit.state';
import { createHomeVisit } from '../../store/home-visit.actions';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { EmployeeService } from '@features/sucursales/services/employee.service';
import { PatientService } from '@features/pacientes/services/patient.service';
import { AnalysisService } from '@features/analitica/services/analysis.service';

// ── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_PATIENT = {
  id: 1, dni: '12345678', firstName: 'Ana', lastName: 'García',
  birthDate: null, gender: null, status: 'ACTIVO', contacts: [], addresses: [],
  coverages: [], active: true, accountStatus: 'LINKED',
} as any;

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

// ── Fixtures ─────────────────────────────────────────────────────────────────

let actions$: ReplaySubject<Action>;
let store: MockStore;

/**
 * Setup compartido con NO_ERRORS_SCHEMA para no necesitar proveer todas las
 * dependencias de componentes hijos (WizardShell, DatePicker, AutoComplete).
 * Los tests de lógica no renderizan el DOM, así que el schema no oculta bugs.
 */
function setup() {
  actions$ = new ReplaySubject<Action>(1);
  TestBed.configureTestingModule({
    imports: [NuevaVisitaPage],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      provideNoopAnimations(),
      provideMockStore({
        initialState: { [DOMICILIO_FEATURE_KEY]: initialDomicilioState },
        selectors: [{ selector: selectHomeVisitsPending, value: false }],
      }),
      provideMockActions(() => actions$),
      { provide: Router, useValue: mockRouter },
      { provide: OperatorBranchContextService, useValue: mockBranchCtx },
      { provide: EmployeeService, useValue: mockEmployeeService },
      { provide: PatientService, useValue: mockPatientService },
      { provide: AnalysisService, useValue: mockAnalysisService },
    ],
  });
  store = TestBed.inject(MockStore);
  const fixture = TestBed.createComponent(NuevaVisitaPage);
  return { fixture, component: fixture.componentInstance };
}

beforeEach(() => {
  vi.clearAllMocks();
  TestBed.resetTestingModule();
});

// ── Suite principal ───────────────────────────────────────────────────────────

describe('NuevaVisitaPage', () => {

  // ── Creación ────────────────────────────────────────────────────────────────

  it('el componente se crea sin errores', () => {
    const { component } = setup();
    expect(component).toBeTruthy();
  });

  it('empieza en el paso 0 (Paciente y horario)', () => {
    const { component } = setup();
    expect(component.currentIndex()).toBe(0);
  });

  it('el formulario se crea con los controles requeridos', () => {
    const { component } = setup();
    const { form } = component;
    expect(form.contains('scheduledAt')).toBe(true);
    expect(form.contains('timeWindowStart')).toBe(true);
    expect(form.contains('timeWindowEnd')).toBe(true);
    expect(form.contains('addressStreet')).toBe(true);
    expect(form.contains('addressCity')).toBe(true);
    expect(form.contains('addressReferences')).toBe(true);
    expect(form.contains('comments')).toBe(true);
  });

  it('STEPS tiene 2 pasos con las claves correctas', () => {
    // STEPS es protected; lo accedemos con cast any para el test.
    const { component } = setup();
    const steps = (component as any).STEPS as readonly { key: string }[];
    expect(steps.length).toBe(2);
    expect(steps[0].key).toBe('paciente');
    expect(steps[1].key).toBe('direccion');
  });

  // ── Validez por paso ────────────────────────────────────────────────────────

  it('step0Valid es false cuando no hay paciente ni fecha ni ventana', () => {
    const { component } = setup();
    expect(component.step0Valid()).toBe(false);
  });

  it('step0Valid es false cuando solo hay fecha pero no paciente seleccionado', () => {
    const { component } = setup();
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00' });
    expect(component.step0Valid()).toBe(false);
  });

  it('step0Valid es true cuando hay paciente + fecha + ventana horaria completa', () => {
    const { component } = setup();
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00' });
    expect(component.step0Valid()).toBe(true);
  });

  it('step1Valid es false cuando falta la calle de la dirección', () => {
    const { component } = setup();
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00', addressStreet: '', addressCity: 'La Plata' });
    expect(component.step1Valid()).toBe(false);
  });

  it('step1Valid es false cuando falta la ciudad', () => {
    const { component } = setup();
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00', addressStreet: 'Av. 7', addressCity: '' });
    expect(component.step1Valid()).toBe(false);
  });

  it('step1Valid es true cuando todos los campos obligatorios están completos', () => {
    const { component } = setup();
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00', addressStreet: 'Av. 7', addressCity: 'La Plata' });
    expect(component.step1Valid()).toBe(true);
  });

  // ── Navegación ──────────────────────────────────────────────────────────────

  it('cancel() navega a /domicilio/agenda', () => {
    const { component } = setup();
    component.cancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/domicilio/agenda']);
  });

  it('next() NO avanza al paso 1 si el paso 0 no es válido', () => {
    const { component } = setup();
    component.next();
    expect(component.currentIndex()).toBe(0);
  });

  it('next() avanza al paso 1 cuando el paso 0 es válido', () => {
    const { component } = setup();
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00' });
    component.next();
    expect(component.currentIndex()).toBe(1);
  });

  it('next() agrega el paso 1 al set de visitados', () => {
    const { component } = setup();
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00' });
    component.next();
    expect(component.visited().has(1)).toBe(true);
  });

  it('prev() retrocede al paso 0 desde el paso 1', () => {
    const { component } = setup();
    component.currentIndex.set(1);
    component.prev();
    expect(component.currentIndex()).toBe(0);
  });

  it('prev() no retrocede más allá del paso 0', () => {
    const { component } = setup();
    component.currentIndex.set(0);
    component.prev();
    expect(component.currentIndex()).toBe(0);
  });

  it('goTo() solo navega a pasos ya visitados (fix hallazgo #3)', () => {
    const { component } = setup();
    // El paso 1 no está visitado aún — goTo() no debe navegar
    component.goTo(1);
    expect(component.currentIndex()).toBe(0);

    // Agregar el paso 1 a visitados y volver a intentar
    component.visited.update((s) => new Set([...s, 1]));
    component.goTo(1);
    expect(component.currentIndex()).toBe(1);
  });

  it('goTo() permite volver a un paso visitado', () => {
    const { component } = setup();
    component.visited.update((s) => new Set([...s, 1]));
    component.currentIndex.set(1);
    component.goTo(0);
    expect(component.currentIndex()).toBe(0);
  });

  // ── Patient / signals ───────────────────────────────────────────────────────

  it('onPatientSelected actualiza la señal selectedPatient', () => {
    const { component } = setup();
    component.onPatientSelected({ ...MOCK_PATIENT, id: 42 });
    expect(component.selectedPatient()?.id).toBe(42);
  });

  // ── [CRITICAL] Wiring del (finish) → dispatch createHomeVisit ──────────────
  //
  // Estos tests verifican que onFinish() — el método cableado via
  // (finish)="onFinish()" en el template — dispara el dispatch correcto.
  //
  // La combinación build AOT verde + estos tests cubre ambas capas:
  //   1) El build AOT detecta si (finish) deja de existir en el shell (NG8002).
  //   2) Estos tests detectan si onFinish() deja de despachar createHomeVisit.

  it('onFinish() despacha createHomeVisit cuando el formulario es completamente válido', () => {
    const { component } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({
      scheduledAt:     new Date(2025, 5, 27, 10, 0, 0),
      timeWindowStart: '08:00',
      timeWindowEnd:   '10:00',
      addressStreet:   'Av. 7',
      addressCity:     'La Plata',
    });

    // onFinish es protected; lo accedemos con cast any para el test.
    (component as any).onFinish();

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: createHomeVisit.type }),
    );
  });

  it('onFinish() NO despacha si el formulario es inválido', () => {
    const { component } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    // Sin completar ningún campo
    (component as any).onFinish();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: createHomeVisit.type }),
    );
  });

  it('onFinish() construye scheduledAt con fecha local sin desfase UTC (fix hallazgo #4)', () => {
    const { component } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    // 27 de junio a las 00:30 hora local
    // En UTC-3: toISOString() daría '2025-06-26T...' (día anterior)
    // La conversión local debe preservar '2025-06-27'
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({
      scheduledAt:     new Date(2025, 5, 27, 0, 30, 0), // junio = mes 5 (0-indexed)
      timeWindowStart: '08:00',
      timeWindowEnd:   '10:00',
      addressStreet:   'Av. 7',
      addressCity:     'La Plata',
    });

    (component as any).onFinish();

    // Buscar en las calls del spy la que matchea createHomeVisit
    const calls = dispatchSpy.mock.calls as unknown as Array<[any]>;
    const matchingCall = calls.find(([a]) => a?.type === createHomeVisit.type);
    expect(matchingCall).toBeDefined();
    const scheduledAt: string = matchingCall![0]?.payload?.scheduledAt ?? '';
    // La fecha local debe preservarse — empieza con '2025-06-27'
    expect(scheduledAt.startsWith('2025-06-27')).toBe(true);
  });
});
