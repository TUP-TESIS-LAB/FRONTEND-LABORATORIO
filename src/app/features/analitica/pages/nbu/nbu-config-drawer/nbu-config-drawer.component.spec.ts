import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';

import { NbuConfigDrawerComponent } from './nbu-config-drawer.component';
import { CatalogRow } from '../../../models/nomenclador.model';
import { DeterminationOverride } from '../../../services/nbu-config-api.service';

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
}

/**
 * Responde la carga inicial: catalog determinations (1 det con unidad), tenant-analyses,
 * secciones, y por determinación override + ref-values.
 */
function flushLoad(http: HttpTestingController, opts: FlushOpts = {}, analysisId = 42, detId = 100): void {
  http.expectOne(`/api/v1/analitica/catalog/${analysisId}/determinations`).flush([
    { id: detId, name: 'Glucemia', unit: 'g/dL' },
  ]);
  http.expectOne('/api/v1/tenant-analyses').flush([
    { id: 7, catalogId: analysisId, nbuCode: 'NBU-099', shortCode: 'GLUC', customName: null, active: true, defaultSectionId: 3 },
  ]);
  http.expectOne((r) => r.url === '/api/v1/sucursales/sections').flush({
    content: [{ id: 3, name: 'Química', areaId: 1, active: true }, { id: 4, name: 'Hematología', areaId: 1, active: true }],
    totalElements: 2, totalPages: 1, number: 0, size: 200,
  });
  const override = opts.override === undefined ? null : opts.override;
  http.expectOne(`/api/v1/analitica/determinations/${detId}/override`).flush({
    hasOverride: override != null,
    override: override == null ? null : { ...emptyOverride(), ...override },
  });
  http.expectOne(`/api/v1/analitica/determinations/${detId}/reference-values/override`).flush(opts.refValues ?? []);
}

describe('NbuConfigDrawerComponent', () => {
  it('smoke: con visible=false no rompe y no dispara requests', () => {
    const { fixture, http } = setup();
    expect(() => fixture.detectChanges()).not.toThrow();
    http.verify();
  });

  it('al abrir dispara los GET de carga (catalog determinations, tenant-analyses, sections, override, ref-values)', () => {
    const { fixture, http } = setup();
    open(fixture);

    http.expectOne('/api/v1/analitica/catalog/42/determinations').flush([
      { id: 100, name: 'Glucemia', unit: 'g/dL' },
    ]);
    http.expectOne('/api/v1/tenant-analyses').flush([
      { id: 7, catalogId: 42, nbuCode: 'NBU-099', shortCode: 'GLUC', customName: null, active: true, defaultSectionId: 3 },
    ]);
    http.expectOne((r) => r.url === '/api/v1/sucursales/sections').flush({
      content: [], totalElements: 0, totalPages: 0, number: 0, size: 200,
    });
    http.expectOne('/api/v1/analitica/determinations/100/override').flush({ hasOverride: false, override: null });
    http.expectOne('/api/v1/analitica/determinations/100/reference-values/override').flush([]);

    http.verify();
  });

  it('resuelve el nombre de la sección desde tenant-analyses + sections', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as { sectionName(): string; active(): boolean };
    expect(cmp.sectionName()).toBe('Química');
    expect(cmp.active()).toBe(true);
  });

  it('precarga el ayuno desde el preIndications del override', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http, { override: { preIndications: 'Ayuno de 8 horas.' } });
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as { ayuno(): string };
    expect(cmp.ayuno()).toBe('Ayuno de 8 horas.');
  });

  it('Guardar el ayuno dispara PUT mergeado (preserva campos técnicos del override)', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http, { override: { requiresApproval: true, printOrder: 5 } });
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as { ayuno: { set(v: string): void }; onSave(): void };
    cmp.ayuno.set('Ayuno de 8 horas.');
    cmp.onSave();

    const req = http.expectOne('/api/v1/analitica/determinations/100/override');
    expect(req.request.method).toBe('PUT');
    // Mergea: preserva requiresApproval/printOrder, solo cambia preIndications.
    expect(req.request.body.requiresApproval).toBe(true);
    expect(req.request.body.printOrder).toBe(5);
    expect(req.request.body.preIndications).toBe('Ayuno de 8 horas.');
    req.flush({});

    http.verify();
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
});
