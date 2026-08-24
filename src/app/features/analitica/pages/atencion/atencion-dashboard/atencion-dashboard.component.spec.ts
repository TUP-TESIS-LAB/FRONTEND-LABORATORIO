import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AtencionDashboardComponent } from './atencion-dashboard.component';
import { ATENCION_FEATURE_KEY, initialAtencionState } from '../../../store/atencion/atencion.state';
import { selectTodayAtenciones } from '../../../store/atencion/atencion.selectors';
import { downloadProtocolLabels, setAtencionFilters } from '../../../store/atencion/atencion.actions';
import { AttentionResponse, AttentionState, isSecretaryResumable } from '../../../models/atencion.model';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { DoctorService } from '@features/medicos/services/doctor.service';
import { Doctor } from '@features/medicos/models/doctor.model';
import { TableAction } from '@shared/ui/models/table-column.model';
import { ConfirmationService } from 'primeng/api';

/** Stub de ModuleRegistry para no depender del feature `tenant` en el MockStore. */
function moduleRegistryStub(financieroActive: boolean) {
  return { isActive: (key: ModuleKey) => key === ModuleKey.Financiero ? financieroActive : true };
}

const DOCTORS: Doctor[] = [
  { id: 7, firstName: 'Ana', lastName: 'García', tuition: 'M-1', registrationType: 'NACIONAL', active: true },
];

/** Stub de DoctorService.list() — por defecto devuelve un médico. */
function doctorServiceStub(list: Doctor[] | 'error' = DOCTORS) {
  return { list: vi.fn(() => list === 'error' ? throwError(() => new Error('boom')) : of(list)) };
}

function setup(financieroActive = true, doctors: Doctor[] | 'error' = DOCTORS) {
  TestBed.configureTestingModule({
    imports: [AtencionDashboardComponent],
    providers: [
      provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState } }),
      provideRouter([]),
      provideNoopAnimations(),
      { provide: ModuleRegistry, useValue: moduleRegistryStub(financieroActive) },
      { provide: DoctorService, useValue: doctorServiceStub(doctors) },
    ],
  });
  return TestBed.createComponent(AtencionDashboardComponent);
}

/** Fila mínima para probar predicados de acción. */
function rowOf(partial: Partial<AttentionResponse>): AttentionResponse {
  return { id: 1, attentionState: AttentionState.IN_EXTRACTION, protocolId: null, doctorId: null, ...partial } as AttentionResponse;
}

function action(c: AtencionDashboardComponent, key: string): TableAction {
  return c.rowActions.find(a => a.key === key)!;
}

describe('AtencionDashboardComponent', () => {
  it('downloadLabels pide confirmación de reimpresión y NO despacha hasta aceptar', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    // ConfirmationService está provisto a nivel componente, así que lo resolvemos
    // desde el injector del componente (no el root del TestBed).
    const confirm = fixture.debugElement.injector.get(ConfirmationService);
    // Capturamos el confirm sin auto-aceptar.
    let accept: (() => void) | undefined;
    vi.spyOn(confirm, 'confirm').mockImplementation((opts: any) => {
      accept = opts.accept;
      return confirm;
    });

    fixture.componentInstance.downloadLabels({ id: 1, protocolId: 9 } as any);
    // Antes de confirmar no se descarga nada.
    expect(spy).not.toHaveBeenCalledWith(downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));

    // Al aceptar, recién ahí despacha la descarga.
    accept!();
    expect(spy).toHaveBeenCalledWith(downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));
  });

  it('downloadLabels sin protocolId no abre el diálogo', () => {
    const fixture = setup();
    const confirm = fixture.debugElement.injector.get(ConfirmationService);
    const confirmSpy = vi.spyOn(confirm, 'confirm');
    fixture.componentInstance.downloadLabels({ id: 1, protocolId: null } as any);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('es solo la lista embebida: sin header propio ("Nueva atención")', () => {
    // El dashboard ya no tiene pantalla propia — vive embebido en la tab "Atenciones"
    // de Recepción, cuyo header global aporta título + "Nueva atención" + "Turnos del día".
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Nueva atención');
    // La búsqueda de la lista sí está presente.
    expect(fixture.nativeElement.querySelector('input[placeholder="Buscar por nombre o DNI"]')).not.toBeNull();
  });

  it('KAN-303: no muestra el bloque "Resumen del día" (no aportaba nada que la tabla no mostrara)', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Resumen del día');
    expect(fixture.nativeElement.querySelector('ui-stat-card')).toBeNull();
  });

  it('B2/T6: el filtro ofrece GRUPOS de estado (5, sin "Fallida")', () => {
    const fixture = setup(true);
    const values = fixture.componentInstance['stateOptions']().map((o: any) => o.value);
    expect(values).toEqual([
      'En espera',
      'Esperando extracción',
      'En extracción',
      'Finalizada',
      'Cancelada',
    ]);
    expect(values).not.toContain('Fallida');
  });

  it('B2: seleccionar "En espera" (FINANCIERO on) expande a todos sus estados', () => {
    const fixture = setup(true);
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onFilterChange({ search: '', states: ['En espera'] } as any);
    expect(spy).toHaveBeenCalledWith(setAtencionFilters({
      filters: {
        search: '',
        states: [
          AttentionState.REGISTERING_GENERAL_DATA,
          AttentionState.REGISTERING_ANALYSES,
          AttentionState.AWAITING_CONFIRMATION,
          AttentionState.ON_COLLECTION_PROCESS,
          AttentionState.ON_BILLING_PROCESS,
        ],
      },
    }));
  });

  it('B2: con FINANCIERO off, "En espera" no expande a Cobro/Facturación', () => {
    const fixture = setup(false);
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onFilterChange({ search: '', states: ['En espera'] } as any);
    expect(spy).toHaveBeenCalledWith(setAtencionFilters({
      filters: {
        search: '',
        states: [
          AttentionState.REGISTERING_GENERAL_DATA,
          AttentionState.REGISTERING_ANALYSES,
          AttentionState.AWAITING_CONFIRMATION,
        ],
      },
    }));
  });

  it('B2: combina varios grupos seleccionados', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onFilterChange({ search: 'x', states: ['Finalizada', 'Cancelada'] } as any);
    expect(spy).toHaveBeenCalledWith(setAtencionFilters({
      filters: { search: 'x', states: [AttentionState.FINISHED, AttentionState.CANCELED] },
    }));
  });

  it('B2: columna Estado usa etiqueta+severidad de GRUPO', () => {
    const c = setup().componentInstance;
    expect(c['groupLabel'](AttentionState.ON_COLLECTION_PROCESS)).toBe('En espera');
    expect(c['groupSeverity'](AttentionState.FINISHED)).toBe('success');
    expect(c['groupSeverity'](AttentionState.CANCELED)).toBe('danger');
  });

  it('B2: "Rótulos" visible sólo en AWAITING_EXTRACTION con protocolId', () => {
    const a = action(setup().componentInstance, 'rotulos');
    expect(a.hidden!(rowOf({ attentionState: AttentionState.AWAITING_EXTRACTION, protocolId: 5 }))).toBe(false);
    expect(a.hidden!(rowOf({ attentionState: AttentionState.AWAITING_EXTRACTION, protocolId: null }))).toBe(true);
    // Finalizada NO reimprime; en extracción tampoco ofrece rótulos.
    expect(a.hidden!(rowOf({ attentionState: AttentionState.FINISHED, protocolId: 5 }))).toBe(true);
    expect(a.hidden!(rowOf({ attentionState: AttentionState.IN_EXTRACTION, protocolId: 5 }))).toBe(true);
  });

  it('B2: "Ver/Retomar" oculto en Cancelada y Fallida (sin ojito)', () => {
    const a = action(setup().componentInstance, 'open');
    expect(a.hidden!(rowOf({ attentionState: AttentionState.CANCELED }))).toBe(true);
    expect(a.hidden!(rowOf({ attentionState: AttentionState.FAILED }))).toBe(true);
    // Visible para el resto, incluida Finalizada (Ver) y esperando/en extracción.
    expect(a.hidden!(rowOf({ attentionState: AttentionState.FINISHED }))).toBe(false);
    expect(a.hidden!(rowOf({ attentionState: AttentionState.AWAITING_EXTRACTION }))).toBe(false);
    expect(a.hidden!(rowOf({ attentionState: AttentionState.IN_EXTRACTION }))).toBe(false);
  });

  it('B3: la columna Médico resuelve el nombre completo cargado en ngOnInit', () => {
    const c = setup().componentInstance;
    c.ngOnInit();
    expect(c.doctorName(7)).toBe('García, Ana');
    expect(c.doctorName(null)).toBe('—');
    expect(c.doctorName(999)).toBe('—');
  });

  it('B3: error del HTTP de médicos no rompe y cae al fallback "—"', () => {
    const c = setup(true, 'error').componentInstance;
    expect(() => c.ngOnInit()).not.toThrow();
    expect(c.doctorName(7)).toBe('—');
  });

  it('011: isSecretaryResumable es false desde AWAITING_EXTRACTION (botón "Ver"), true en fases de secretaría', () => {
    expect(isSecretaryResumable(AttentionState.REGISTERING_GENERAL_DATA)).toBe(true);
    expect(isSecretaryResumable(AttentionState.AWAITING_CONFIRMATION)).toBe(true);
    expect(isSecretaryResumable(AttentionState.AWAITING_EXTRACTION)).toBe(false);
    expect(isSecretaryResumable(AttentionState.IN_EXTRACTION)).toBe(false);
    expect(isSecretaryResumable(AttentionState.FINISHED)).toBe(false);
  });

  it('013: cancellationTooltip devuelve el motivo en estados terminales y null en el resto', () => {
    const c = setup().componentInstance;
    expect(c.cancellationTooltip(
      { attentionState: AttentionState.CANCELED, cancellationReason: 'Paciente desistió', extractionCancellationReason: null } as any,
    )).toBe('Paciente desistió');
    // Cae al motivo de "no se presentó" cuando no hay cancelación terminal.
    expect(c.cancellationTooltip(
      { attentionState: AttentionState.FAILED, cancellationReason: null, extractionCancellationReason: 'No se presentó' } as any,
    )).toBe('No se presentó');
    // Estado no terminal → sin tooltip.
    expect(c.cancellationTooltip(
      { attentionState: AttentionState.AWAITING_EXTRACTION, cancellationReason: 'x', extractionCancellationReason: null } as any,
    )).toBeNull();
    // Terminal pero sin motivo → null.
    expect(c.cancellationTooltip(
      { attentionState: AttentionState.CANCELED, cancellationReason: null, extractionCancellationReason: null } as any,
    )).toBeNull();
  });

  it('T9: el ícono info vive en el header "Estado" (uno solo), no en las filas', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectTodayAtenciones, [
      { id: 1, attentionState: AttentionState.CANCELED, cancellationReason: 'Paciente desistió',
        extractionCancellationReason: null, protocolId: null, doctorId: null, createdAt: null } as any,
      { id: 2, attentionState: AttentionState.CANCELED, cancellationReason: null,
        extractionCancellationReason: null, protocolId: null, doctorId: null, createdAt: null } as any,
      { id: 3, attentionState: AttentionState.IN_EXTRACTION, cancellationReason: null,
        extractionCancellationReason: null, protocolId: null, doctorId: null, createdAt: null } as any,
    ]);
    store.refreshState();
    fixture.detectChanges();

    // Un único ícono info, y está en el header (no se multiplica por fila).
    const headerIcons = fixture.nativeElement.querySelectorAll('thead i.pi-info-circle');
    expect(headerIcons.length).toBe(1);
    const rowIcons = fixture.nativeElement.querySelectorAll('tbody i.pi-info-circle');
    expect(rowIcons.length).toBe(0);
  });

  it('T9: la fila CANCELED con motivo envuelve el tag en un span con tooltip (sin ícono)', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectTodayAtenciones, [
      { id: 1, attentionState: AttentionState.CANCELED, cancellationReason: 'Paciente desistió',
        extractionCancellationReason: null, protocolId: null, doctorId: null, createdAt: null } as any,
      { id: 2, attentionState: AttentionState.CANCELED, cancellationReason: null,
        extractionCancellationReason: null, protocolId: null, doctorId: null, createdAt: null } as any,
    ]);
    store.refreshState();
    fixture.detectChanges();

    // Sólo la fila con motivo lleva el span focusable contenedor del tooltip.
    const spans = fixture.nativeElement.querySelectorAll('tbody span[tabindex="0"]');
    expect(spans.length).toBe(1);
  });
});
