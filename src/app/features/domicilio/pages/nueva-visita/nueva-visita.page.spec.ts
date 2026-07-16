/**
 * Tests para NuevaVisitaPage.
 *
 * ── Cobertura del binding `(finish)="onFinish()"` ─────────────────────────────
 *
 * Se intentó agregar un test que montase `NuevaVisitaPage` SIN NO_ERRORS_SCHEMA
 * (con el `WizardShellComponent` real) para verificar el wiring del template
 * via `By.directive + shellInstance.finish.emit()`. Sin embargo, el entorno
 * vitest/JIT no puede satisfacer los `input.required<>()` de `WizardShellComponent`
 * cuando se propagan desde el template del padre (NuevaVisitaPage), produciendo:
 *
 *   - NG0303: Can't bind to 'steps' since it isn't a known property of 'ui-wizard-shell'
 *   - NG0950: Input is required but no value is available yet (en heading, steps, etc.)
 *
 * Estos errores se deben a que en JIT las propiedades declaradas con la API
 * `input()` / `input.required()` (signal inputs, Angular 17+) no son reconocidas
 * como `@Input()` por el compilador JIT al momento de parsear el template del
 * componente padre. Angular JIT no entiende los signal inputs declarados en
 * componentes standalone con `input.required<>()` cuando el padre los bindea en
 * su template.
 *
 * Por eso la protección del binding `(finish)` se delega a dos capas:
 *
 *   1. Build AOT (producción/CI): `ng build` compilará `NuevaVisitaPage` con AOT
 *      y detectará automáticamente si `(finish)` deja de ser un output válido de
 *      `WizardShellComponent`, produciendo NG8002 y fallando el build.
 *      También detectaría si `(finish)="onFinish()"` se elimina del template y
 *      `onFinish()` no existe (template expression check).
 *
 *   2. Tests directos de `onFinish()` (debajo): verifican que el método cableado
 *      al output sí despacha `createHomeVisit` cuando es invocado correctamente.
 *      Si alguien renombra el método o cambia la lógica, estos tests fallan.
 *
 * Nota: `ng test` (AOT, @angular/build:unit-test) está bloqueado por specs
 * pre-existentes ajenos (`analitica/muestras`) que aún no compilan en AOT, así
 * que la verificación AOT actual pasa por `npm run build`.
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
  getById: vi.fn().mockReturnValue(of(MOCK_PATIENT)),
};
const mockAnalysisService = {
  searchByName: () => of([]),
  searchByShortCodePrefix: () => of([]),
  findByShortCode: () => of(null),
};

/** Asigna un extractor (obligatorio) reusando el handler del autocomplete. */
function selectExtractor(component: any): void {
  component.onExtractorSelect({
    value: { id: 5, firstName: 'Lucas', lastName: 'Martínez', displayName: 'Martínez, Lucas', active: true },
  });
}

/** Agrega un análisis (obligatorio) reusando el handler del picker. */
function addAnalysis(component: any, id = 1): void {
  component.onAnalysisAdded({ id, shortCode: 'HEM', name: 'Hemograma' });
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

let actions$: ReplaySubject<Action>;
let store: MockStore;

/**
 * Setup compartido con NO_ERRORS_SCHEMA para no necesitar proveer todas las
 * dependencias de componentes hijos (WizardShell, DatePicker, AutoComplete).
 * Los tests de lógica no renderizan el DOM, así que el schema no oculta bugs.
 */
function setup(inputs?: { patientId?: string }) {
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
  if (inputs?.patientId !== undefined) {
    // El input patientId requiere flush del `effect` (Task 4) — detectChanges lo dispara.
    fixture.componentRef.setInput('patientId', inputs.patientId);
    fixture.detectChanges();
  }
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

  it('STEPS tiene 4 pasos con las claves correctas', () => {
    const { component } = setup();
    const steps = (component as any).STEPS as readonly { key: string }[];
    expect(steps.map((s) => s.key)).toEqual(['paciente', 'direccion', 'analisis', 'resumen']);
  });

  it('step2Valid es false sin análisis y true con al menos uno (rótulos requieren determinaciones)', () => {
    const { component } = setup();
    expect(component.step2Valid()).toBe(false);
    addAnalysis(component);
    expect(component.step2Valid()).toBe(true);
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

  it('step0Valid recomputa al cargar fecha/horas DESPUÉS del paciente (regresión: no se podía pasar del paso 1)', () => {
    // Reproduce el orden real del usuario: primero el paciente, luego el resto.
    // El template lee step0Valid() en cada change detection, así que se lo lee acá
    // en el medio para cachear el `false` — como hacía la app. Sin la dependencia
    // reactiva al form, el computed quedaba stale en false y "Continuar" nunca se
    // habilitaba.
    const { component } = setup();
    component.onPatientSelected(MOCK_PATIENT);
    expect(component.step0Valid()).toBe(false); // se cachea con el form aún vacío
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00' });
    expect(component.step0Valid()).toBe(true);  // debe reaccionar al cambio del form
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

  it('step1Valid es false cuando falta el extractor asignado aunque la dirección esté completa', () => {
    const { component } = setup();
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00', addressStreet: 'Av. 7', addressCity: 'La Plata' });
    expect(component.step1Valid()).toBe(false);
  });

  it('step1Valid es true cuando la dirección está completa y hay extractor asignado', () => {
    const { component } = setup();
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00', addressStreet: 'Av. 7', addressCity: 'La Plata' });
    selectExtractor(component);
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

  it('next() avanza de a un paso solo si el paso actual es válido', () => {
    const { component } = setup();
    component.next();                       // paso 0 inválido (sin paciente) -> no avanza
    expect(component.currentIndex()).toBe(0);
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00' });
    component.next();                       // paso 0 válido -> avanza a 1
    expect(component.currentIndex()).toBe(1);
    component.form.patchValue({ addressStreet: 'Av 7', addressCity: 'La Plata' });
    component.next();                       // paso 1 sin extractor -> no avanza
    expect(component.currentIndex()).toBe(1);
    selectExtractor(component);
    component.next();                       // paso 1 válido -> 2
    expect(component.currentIndex()).toBe(2);
    component.next();                       // paso 2 sin análisis -> no avanza
    expect(component.currentIndex()).toBe(2);
    addAnalysis(component);
    component.next();                       // paso 2 válido -> 3 (resumen)
    expect(component.currentIndex()).toBe(3);
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

  it('al seleccionar un paciente con dirección primaria, precarga calle/número/ciudad', () => {
    const { component } = setup();
    mockPatientService.getById.mockReturnValue(of({
      ...MOCK_PATIENT,
      addresses: [{ street: 'Calle 50', streetNumber: '1234', city: 'La Plata', isPrimary: true, active: true }],
    }));
    component.onPatientSelected(MOCK_PATIENT);
    expect(mockPatientService.getById).toHaveBeenCalledWith(MOCK_PATIENT.id);
    expect(component.form.controls.addressStreet.value).toBe('Calle 50');
    expect(component.form.controls.addressNumber.value).toBe('1234');
    expect(component.form.controls.addressCity.value).toBe('La Plata');
    expect(component.prefillPatientName()).toContain('García'); // apellido del MOCK_PATIENT
  });

  it('paciente sin dirección primaria: no precarga y limpia la dirección previa', () => {
    const { component } = setup();
    component.form.patchValue({ addressStreet: 'vieja', addressCity: 'vieja' });
    mockPatientService.getById.mockReturnValue(of({ ...MOCK_PATIENT, addresses: [] }));
    component.onPatientSelected(MOCK_PATIENT);
    expect(component.form.controls.addressStreet.value).toBe('');
    expect(component.prefillPatientName()).toBeNull();
  });

  it('con patientId en la ruta, preselecciona el paciente y precarga su dirección', () => {
    mockPatientService.getById.mockReturnValue(of({
      ...MOCK_PATIENT, id: 77,
      addresses: [{ street: 'Calle 50', city: 'La Plata', isPrimary: true, active: true }],
    }));
    const { component } = setup({ patientId: '77' });
    expect(mockPatientService.getById).toHaveBeenCalledWith(77);
    expect(component.selectedPatient()?.id).toBe(77);
    expect(component.form.controls.addressStreet.value).toBe('Calle 50');
  });

  it('addressSource: none sin precarga; prefilled tras precargar; edited al modificar', () => {
    const { component } = setup();
    expect(component.addressSource()).toBe('none');
    mockPatientService.getById.mockReturnValue(of({
      ...MOCK_PATIENT,
      addresses: [{ street: 'Calle 50', streetNumber: '1234', city: 'La Plata', isPrimary: true, active: true }],
    }));
    component.onPatientSelected(MOCK_PATIENT);
    expect(component.addressSource()).toBe('prefilled');
    component.form.controls.addressStreet.setValue('Otra calle');
    expect(component.addressSource()).toBe('edited');
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
    selectExtractor(component);
    addAnalysis(component);

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
    selectExtractor(component);
    addAnalysis(component);

    (component as any).onFinish();

    // Buscar en las calls del spy la que matchea createHomeVisit
    const calls = dispatchSpy.mock.calls as unknown as Array<[any]>;
    const matchingCall = calls.find(([a]) => a?.type === createHomeVisit.type);
    expect(matchingCall).toBeDefined();
    const scheduledAt: string = matchingCall![0]?.payload?.scheduledAt ?? '';
    // La fecha local debe preservarse — empieza con '2025-06-27'
    expect(scheduledAt.startsWith('2025-06-27')).toBe(true);
  });

  it('onFinish() arma scheduledAt con la hora de inicio de la ventana, no la del datepicker (fix hallazgo #5)', () => {
    const { component } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    // El datepicker trae la hora del instante en que se abrió (00:30); el scheduledAt
    // debe usar la hora de la ventana (09:15) para no quedar en el pasado (@Future).
    component.onPatientSelected(MOCK_PATIENT);
    component.form.patchValue({
      scheduledAt:     new Date(2025, 5, 27, 0, 30, 0),
      timeWindowStart: '09:15',
      timeWindowEnd:   '10:00',
      addressStreet:   'Av. 7',
      addressCity:     'La Plata',
    });
    selectExtractor(component);
    addAnalysis(component);

    (component as any).onFinish();

    const calls = dispatchSpy.mock.calls as unknown as Array<[any]>;
    const matchingCall = calls.find(([a]) => a?.type === createHomeVisit.type);
    const scheduledAt: string = matchingCall![0]?.payload?.scheduledAt ?? '';
    expect(scheduledAt).toBe('2025-06-27T09:15:00');
  });
});
