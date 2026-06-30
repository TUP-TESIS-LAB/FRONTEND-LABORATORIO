import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';

import { NbuConfigDrawerComponent } from './nbu-config-drawer.component';
import { CatalogRow } from '../../../models/nomenclador.model';
import { DeterminationOverride, NbuConfigApiService } from '../../../services/nbu-config-api.service';

function catalogRow(over: Partial<CatalogRow> = {}): CatalogRow {
  return {
    id: 42,
    shortCode: 'GLUC',
    name: 'Glucosa',
    familyName: 'Bioquímica',
    nbuCode: 'NBU-099',
    cantidadUb: 5,
    ...over,
  };
}

function emptyOverride(): DeterminationOverride {
  return {
    percentageVariationTolerated: null, preIndications: null, preObservations: null,
    analyticalType: null, canBringSample: null, measurementUnitId: null, isPrintable: null,
    printOrder: null, printGroup: null, specialPrintName: null, loadingResultOrder: null,
    requiresLoadValue: null, requiresApproval: null, canSelfApprove: null,
    handlingTimeValue: null, handlingTimeUnit: null,
  };
}

function setup() {
  TestBed.configureTestingModule({
    imports: [NbuConfigDrawerComponent],
    providers: [
      provideNoopAnimations(),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(NbuConfigDrawerComponent);
  return { fixture, http };
}

/** Abre el drawer (input visible=true + analysis) y dispara ngOnChanges. */
function open(fixture: ComponentFixture<NbuConfigDrawerComponent>, analysis = catalogRow()): void {
  fixture.componentRef.setInput('analysis', analysis);
  fixture.componentRef.setInput('visible', true);
  fixture.detectChanges();
}

interface FlushOpts {
  override?: Partial<DeterminationOverride> | null;
  refValues?: unknown[];
  prepItems?: unknown[];
  prepTypes?: unknown[];
}

/**
 * Responde la carga inicial: catalog determinations (1 det), tenant-analyses,
 * preparation-types; y por determinación: override + ref-values + preparation.
 */
function flushLoad(http: HttpTestingController, opts: FlushOpts = {}, analysisId = 42, detId = 100, tenantRow?: Record<string, unknown>): void {
  // Outer forkJoin: determinations + tenantRows + prepTypes (simultáneo)
  http.expectOne(`/api/v1/analitica/catalog/${analysisId}/determinations`).flush([
    { id: detId, name: 'Glucemia', unit: 'g/dL' },
  ]);
  http.expectOne('/api/v1/tenant-analyses').flush([
    tenantRow ?? { id: 7, catalogId: analysisId, nbuCode: 'NBU-099', shortCode: 'GLUC', customName: null, active: true, defaultSectionId: 3 },
  ]);
  http.expectOne('/api/v1/analitica/preparation/types').flush(opts.prepTypes ?? []);

  // Inner forkJoin por det: override + refValues + preparation
  const override = opts.override === undefined ? null : opts.override;
  http.expectOne(`/api/v1/analitica/determinations/${detId}/override`).flush({
    hasOverride: override != null,
    override: override == null ? null : { ...emptyOverride(), ...override },
  });
  http.expectOne(`/api/v1/analitica/determinations/${detId}/reference-values/override`).flush(opts.refValues ?? []);
  http.expectOne(`/api/v1/analitica/determinations/${detId}/preparation`).flush({ items: opts.prepItems ?? [] });
}

describe('NbuConfigDrawerComponent', () => {
  it('smoke: con visible=false no rompe y no dispara requests', () => {
    const { fixture, http } = setup();
    expect(() => fixture.detectChanges()).not.toThrow();
    http.verify();
  });

  it('al abrir dispara los GET de carga (catalog determinations, tenant-analyses, preparation-types, override, ref-values, preparation) y NO pide sections', () => {
    const { fixture, http } = setup();
    open(fixture);

    http.expectOne('/api/v1/analitica/catalog/42/determinations').flush([
      { id: 100, name: 'Glucemia', unit: 'g/dL' },
    ]);
    http.expectOne('/api/v1/tenant-analyses').flush([
      { id: 7, catalogId: 42, nbuCode: 'NBU-099', shortCode: 'GLUC', customName: null, active: true, defaultSectionId: 3 },
    ]);
    http.expectOne('/api/v1/analitica/preparation/types').flush([]);
    http.expectOne('/api/v1/analitica/determinations/100/override').flush({ hasOverride: false, override: null });
    http.expectOne('/api/v1/analitica/determinations/100/reference-values/override').flush([]);
    http.expectOne('/api/v1/analitica/determinations/100/preparation').flush({ items: [] });

    // Ya no se piden las secciones (la sección se configura en otra pantalla).
    expect(http.match((r) => r.url === '/api/v1/sucursales/sections').length).toBe(0);

    http.verify();
  });

  it('prefilla código interno y nombre propio desde tenant-analyses', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http, {}, 42, 100, { id: 7, catalogId: 42, nbuCode: 'NBU-099', shortCode: 'GLUC', customName: 'Glucemia', active: true, defaultSectionId: 3 });
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      active(): boolean;
      generalForm: { controls: { shortCode: { value: string }; customName: { value: string | null } } };
    };
    expect(cmp.generalForm.controls.shortCode.value).toBe('GLUC');
    expect(cmp.generalForm.controls.customName.value).toBe('Glucemia');
    expect(cmp.active()).toBe(true);
  });

  it('Guardar con código interno y nombre propio cambiados dispara PATCH /tenant-analyses/{id}', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      generalForm: { controls: { shortCode: { setValue(v: string): void }; customName: { setValue(v: string | null): void } } };
      onSave(): void;
    };
    cmp.generalForm.controls.shortCode.setValue('GLU2');
    cmp.generalForm.controls.customName.setValue('Glucemia basal');
    cmp.onSave();

    const req = http.expectOne('/api/v1/tenant-analyses/7');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ shortCode: 'GLU2', customName: 'Glucemia basal' });
    req.flush({});

    http.verify();
  });

  it('código interno vacío bloquea el guardado (no dispara mutaciones)', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      generalForm: { controls: { shortCode: { setValue(v: string): void } } };
      onSave(): void;
    };
    cmp.generalForm.controls.shortCode.setValue('   ');
    cmp.onSave();

    http.verify(); // sin mutaciones: la validación bloqueó
  });

  it('precarga las observaciones del override en el DetForm (preObservations → observations)', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http, { override: { preObservations: 'Observación de prueba.' } });
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      detForms: Array<{ observations: string }>;
    };
    expect(cmp.detForms[0].observations).toBe('Observación de prueba.');
  });

  it('precarga los tipos de preparación desde preparation items en el DetForm', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http, { prepItems: [{ type: 'AYUNO', fastingHours: 8 }, { type: 'NO_FUMAR', fastingHours: null }] });
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      detForms: Array<{ prepTypes: Set<string>; fastingHours: number | null }>;
    };
    expect(cmp.detForms[0].prepTypes.has('AYUNO')).toBe(true);
    expect(cmp.detForms[0].prepTypes.has('NO_FUMAR')).toBe(true);
    expect(cmp.detForms[0].fastingHours).toBe(8);
  });

  it('Guardar sin cambios emite saved sin requests de mutación', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http);
    fixture.detectChanges();

    let emitted: number | undefined;
    fixture.componentInstance.saved.subscribe((id: number) => (emitted = id));

    (fixture.componentInstance as unknown as { onSave(): void }).onSave();

    http.verify(); // no debe haber requests pendientes (no hubo cambios)
    expect(emitted).toBe(42);
  });

  it('Guardar ref-values manda unit de la determinación y edades en meses', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http, { refValues: [{ minValue: 70, maxValue: 100, criticalMinValue: null, criticalMaxValue: null, ageMinMonths: 240, ageMaxMonths: 600, gender: null, unit: 'g/dL' }] });
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      detForms: Array<{ refValues: { controls: Array<{ controls: { ageMinYears: { setValue(v: number): void } } }> } }>;
      onSave(): void;
    };
    // Edad cargada 240m = 20 años; la cambio a 30 años → 360m.
    cmp.detForms[0].refValues.controls[0].controls.ageMinYears.setValue(30);
    cmp.onSave();

    const req = http.expectOne('/api/v1/analitica/determinations/100/reference-values/override');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body[0].unit).toBe('g/dL');
    expect(req.request.body[0].ageMinMonths).toBe(360);
    expect(req.request.body[0].ageMaxMonths).toBe(600);
    req.flush([]);

    http.verify();
  });

  it('validación mín>=máx bloquea el guardado (no dispara mutaciones)', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http, { refValues: [{ minValue: 100, maxValue: 70, criticalMinValue: null, criticalMaxValue: null, ageMinMonths: null, ageMaxMonths: null, gender: null, unit: 'g/dL' }] });
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      detForms: Array<{ refValues: { controls: Array<{ controls: { maxValue: { setValue(v: number): void } } }> } }>;
      onSave(): void;
    };
    // Forzar un cambio inválido (mín 100 >= máx 50) y guardar.
    cmp.detForms[0].refValues.controls[0].controls.maxValue.setValue(50);
    cmp.onSave();

    http.verify(); // no debe haber mutaciones: la validación bloqueó
  });

  it('onToggleActive(true) llama setActivation con catalogId, active y shortCode', () => {
    const { fixture } = setup();
    const api = TestBed.inject(NbuConfigApiService);
    const setActivation = vi.spyOn(api, 'setActivation').mockReturnValue(of(undefined));
    const component = fixture.componentInstance as unknown as {
      analysis: CatalogRow | null;
      generalForm: { controls: { shortCode: { setValue(v: string): void }; customName: { value: string | null } } };
      active: { set(v: boolean): void };
      onToggleActive(v: boolean): void;
    };
    component.analysis = { id: 100, name: 'Glucemia' } as unknown as CatalogRow;
    component.generalForm.controls.shortCode.setValue('GLU');
    component.active.set(false);

    component.onToggleActive(true);

    expect(setActivation).toHaveBeenCalledWith(100, true, 'GLU', null);
  });

  it('guarda la preparación estructurada cambiada vía upsertPreparation', () => {
    const { fixture } = setup();
    const api = TestBed.inject(NbuConfigApiService);
    const upsert = vi.spyOn(api, 'upsertPreparation').mockReturnValue(of(undefined));
    const component = fixture.componentInstance as unknown as {
      detForms: unknown[];
      analysis: CatalogRow | null;
      generalForm: { controls: { shortCode: { setValue(v: string): void } } };
      fb: import('@angular/forms').FormBuilder;
      onSave(): void;
    };
    component['detForms'] = [{
      detId: 7, detName: 'Glucemia', unit: 'mg/dL', existingOverride: null,
      refValues: component['fb'].array([]), originalRefValues: '[]',
      prepTypes: new Set(['AYUNO', 'NO_FUMAR']), fastingHours: 8, observations: '',
      originalPrep: JSON.stringify({ types: [], hours: null, obs: '' }),
    } as any];
    component.analysis = { id: 100, name: 'Glucemia' } as any;
    component['generalForm'].controls.shortCode.setValue('GLU');

    component['onSave']();

    expect(upsert).toHaveBeenCalledWith(7, [
      { type: 'AYUNO', fastingHours: 8 },
      { type: 'NO_FUMAR', fastingHours: null },
    ]);
  });

  it('bloquea guardar si hay segmentos (sexo+edad) solapados', () => {
    const { fixture } = setup();
    const api = TestBed.inject(NbuConfigApiService);
    const upsert = vi.spyOn(api, 'upsertReferenceValues').mockReturnValue(of([]));
    const component = fixture.componentInstance as unknown as {
      detForms: unknown[];
      analysis: CatalogRow | null;
      generalForm: { controls: { shortCode: { setValue(v: string): void } } };
      fb: import('@angular/forms').FormBuilder;
      onSave(): void;
    };
    // Dos filas: MALE 0-30 años y MALE 20-40 años → solape (20-30 en meses: 240-360 vs 0-360)
    const fb = component['fb'];
    const row1 = fb.group({
      minValue: fb.control<number | null>(null),
      maxValue: fb.control<number | null>(null),
      criticalMinValue: fb.control<number | null>(null),
      criticalMaxValue: fb.control<number | null>(null),
      ageMinYears: fb.control<number | null>(0),
      ageMaxYears: fb.control<number | null>(30),
      gender: fb.control<'MALE' | 'FEMALE' | null>('MALE'),
    });
    const row2 = fb.group({
      minValue: fb.control<number | null>(null),
      maxValue: fb.control<number | null>(null),
      criticalMinValue: fb.control<number | null>(null),
      criticalMaxValue: fb.control<number | null>(null),
      ageMinYears: fb.control<number | null>(20),
      ageMaxYears: fb.control<number | null>(40),
      gender: fb.control<'MALE' | 'FEMALE' | null>('MALE'),
    });
    const refValues = fb.array([row1, row2]);
    const originalRefValues = '[]'; // distinto para que se intente guardar
    component['detForms'] = [{
      detId: 7, detName: 'Glucemia', unit: 'mg/dL', existingOverride: null,
      refValues,
      originalRefValues,
      prepTypes: new Set<string>(), fastingHours: null, observations: '',
      originalPrep: JSON.stringify({ types: [], hours: null, obs: '' }),
    } as any];
    component.analysis = { id: 100, name: 'Glucemia' } as any;
    component['generalForm'].controls.shortCode.setValue('GLU');

    component['onSave']();

    expect(upsert).not.toHaveBeenCalled();
  });
});
