import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';

import { NbuConfigDrawerComponent } from './nbu-config-drawer.component';
import { CatalogRow } from '../../../models/nomenclador.model';

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

/** Responde la carga inicial: detalle del análisis (1 determinación), tenant-analyses, secciones. */
function flushLoad(http: HttpTestingController, analysisId = 42, detId = 100): void {
  http.expectOne(`/api/v1/analitica/analysis/${analysisId}`).flush({
    id: analysisId, shortCode: 'GLUC', name: 'Glucosa', familyName: 'Bioquímica', ubCount: 5,
    description: null, determinations: [{ id: detId, name: 'Glucemia' }],
    processingTime: null, processingTimeUnit: null, nbuCode: 'NBU-099',
  });
  http.expectOne('/api/v1/tenant-analyses').flush([
    { id: 7, catalogId: analysisId, nbuCode: 'NBU-099', shortCode: 'GLUC', customName: null, active: true, defaultSectionId: 3 },
  ]);
  http.expectOne((r) => r.url === '/api/v1/sucursales/sections').flush({
    content: [{ id: 3, name: 'Química', areaId: 1, active: true }, { id: 4, name: 'Hematología', areaId: 1, active: true }],
    totalElements: 2, totalPages: 1, number: 0, size: 200,
  });
  // Carga por determinación.
  http.expectOne(`/api/v1/analitica/determinations/${detId}/override`).flush({ hasOverride: false, override: null });
  http.expectOne(`/api/v1/analitica/determinations/${detId}/reference-values/override`).flush([]);
}

describe('NbuConfigDrawerComponent', () => {
  it('smoke: con visible=false no rompe y no dispara requests', () => {
    const { fixture, http } = setup();
    expect(() => fixture.detectChanges()).not.toThrow();
    http.verify();
  });

  it('al abrir dispara los GET de carga (getById, tenant-analyses, sections, override, ref-values)', () => {
    const { fixture, http } = setup();
    open(fixture);

    http.expectOne('/api/v1/analitica/analysis/42').flush({
      id: 42, shortCode: 'GLUC', name: 'Glucosa', familyName: null, ubCount: 5,
      description: null, determinations: [{ id: 100, name: 'Glucemia' }],
      processingTime: null, processingTimeUnit: null, nbuCode: 'NBU-099',
    });
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

  it('Guardar con cambio de sección dispara PATCH /tenant-analyses/{id}', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      generalForm: { controls: { sectionId: { setValue(v: number | null): void } } };
      onSave(): void;
    };
    // Cambiar sección 3 → 4.
    cmp.generalForm.controls.sectionId.setValue(4);
    cmp.onSave();

    const req = http.expectOne('/api/v1/tenant-analyses/7');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ defaultSectionId: 4 });
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

  it('Guardar con override modificado dispara PUT /determinations/{id}/override', () => {
    const { fixture, http } = setup();
    open(fixture);
    flushLoad(http);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      detForms: Array<{ detId: number; override: { controls: { preIndications: { setValue(v: string): void } } } }>;
      onSave(): void;
    };
    cmp.detForms[0].override.controls.preIndications.setValue('Ayuno 8h');
    cmp.onSave();

    const req = http.expectOne('/api/v1/analitica/determinations/100/override');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.preIndications).toBe('Ayuno 8h');
    req.flush({});

    http.verify();
  });
});
