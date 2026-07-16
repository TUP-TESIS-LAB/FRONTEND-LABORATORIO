import { describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { CargarResultadosPage } from './cargar-resultados.page';
import { PlanillaGridBuilderService } from '../../services/planilla-grid-builder.service';
import { ResultadosApiService } from '../../services/resultados-api.service';
import type { PlanillaGrid } from '../../models/resultado.model';

const GRID: PlanillaGrid = {
  templateId: 1, templateName: 'prueba',
  columns: [
    { protocolId: 50014, patientName: 'María López', label: 'María López' },
    { protocolId: 50015, patientName: 'Roberto Fernández', label: 'Roberto Fernández' },
  ],
  sections: [{
    analysisCatalogId: 6, analysisName: 'Colesterol Total',
    rows: [{
      catalogId: 90100, name: 'Colesterol', unit: 'mg/dL',
      cells: {
        50014: { resultId: 700, determinationId: 800, value: '210' },
        50015: { resultId: null, determinationId: null, value: '' }, // GAP-P5: no persiste
      },
    }],
  }],
};

// Grid con un protocolo cubierto por DOS análisis (varias determinaciones) → un solo item agregado.
const GRID_MULTI: PlanillaGrid = {
  templateId: 1, templateName: 'multi',
  columns: [{ protocolId: 60001, patientName: 'Ana Díaz', label: 'Ana Díaz' }],
  sections: [
    {
      analysisCatalogId: 6, analysisName: 'Colesterol Total',
      rows: [{
        catalogId: 90100, name: 'Colesterol', unit: 'mg/dL',
        cells: { 60001: { resultId: 700, determinationId: 800, value: '210' } }, // cargada
      }],
    },
    {
      analysisCatalogId: 7, analysisName: 'Hemograma',
      rows: [
        {
          catalogId: 90200, name: 'Hematocrito', unit: '%',
          cells: { 60001: { resultId: 701, determinationId: 801, value: '' } }, // vacía
        },
        {
          catalogId: 90201, name: 'Hemoglobina', unit: 'g/dL',
          cells: { 60001: { resultId: 701, determinationId: 802, value: '14' } }, // cargada
        },
      ],
    },
  ],
};

function setup(query: Record<string, string | null>, grid: PlanillaGrid = GRID): {
  fx: ComponentFixture<CargarResultadosPage>;
  build: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
  markReady: ReturnType<typeof vi.fn>;
} {
  const build = vi.fn().mockReturnValue(of(grid));
  const navigate = vi.fn().mockResolvedValue(true);
  const markReady = vi.fn().mockReturnValue(of({}));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CargarResultadosPage],
    providers: [
      provideNoopAnimations(),
      MessageService,
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (k: string) => query[k] ?? null } } } },
      { provide: Router, useValue: { navigate } },
      { provide: PlanillaGridBuilderService, useValue: { build } },
      { provide: ResultadosApiService, useValue: { batchUpdate: vi.fn().mockReturnValue(of([])), markReady } },
    ],
  });
  TestBed.overrideTemplate(CargarResultadosPage, '<span>{{ grid()?.templateName }}</span>');
  const fx = TestBed.createComponent(CargarResultadosPage);
  fx.detectChanges();
  return { fx, build, navigate, markReady };
}

describe('CargarResultadosPage (smoke)', () => {
  it('lee protocolIds y templateId del query param y arma el grid', () => {
    const { fx, build } = setup({ protocols: '50014,50015', templateId: '1' });
    const cmp = fx.componentInstance;
    expect(cmp.protocolIds).toEqual([50014, 50015]);
    expect(cmp.templateId).toBe(1);
    expect(build).toHaveBeenCalledWith(1, [50014, 50015]);
    expect(cmp.grid()?.templateName).toBe('prueba');
  });

  it('si falta templateId no llama al builder (estado vacío)', () => {
    const { fx, build } = setup({ protocols: '50014', templateId: null });
    expect(build).not.toHaveBeenCalled();
    expect(fx.componentInstance.grid()).toBeNull();
  });

  it('el resumen arma un ResumenMuestra por protocolo y cuenta solo persistibles (GAP-P5)', () => {
    const { fx } = setup({ protocols: '50014,50015', templateId: '1' });
    const items = fx.componentInstance.resumenItems();
    // 50014 tiene una determinación persistible (completa); 50015 no tiene ninguna → se omite.
    expect(items.length).toBe(1);
    const i = items[0];
    expect(i.protocolId).toBe(50014);
    expect(i.code).toBe('Protocolo #50014');   // code = protocolo (no barcode en planilla)
    expect(i.patient).toBe('María López');
    expect(i.filled).toBe(1);
    expect(i.total).toBe(1);
    expect(i.status).toBe('completa');
    expect(i.resultIds).toEqual([700]);
  });

  it('agrega varias secciones (análisis) del mismo protocolo en un solo item parcial', () => {
    const { fx } = setup({ protocols: '60001', templateId: '1' }, GRID_MULTI);
    const items = fx.componentInstance.resumenItems();
    expect(items.length).toBe(1);
    const i = items[0];
    expect(i.protocolId).toBe(60001);
    expect(i.code).toBe('Protocolo #60001');
    expect(i.patient).toBe('Ana Díaz');
    // 3 determinaciones persistibles, 2 cargadas → parcial.
    expect(i.total).toBe(3);
    expect(i.filled).toBe(2);
    expect(i.status).toBe('parcial');
    // resultIds distintos de las dos secciones.
    expect([...i.resultIds].sort((a, b) => a - b)).toEqual([700, 701]);
  });

  it('"Mantener" (resumenClosed) cierra el modal y vuelve a procesamiento', () => {
    const { fx, navigate } = setup({ protocols: '50014', templateId: '1' });
    const cmp = fx.componentInstance;
    cmp.resumenClosed();
    expect(cmp.resumenOpen()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/analitica/procesamiento']);
  });

  it('"Marcar completadas" hace markReady y luego vuelve a procesamiento', () => {
    const { fx, navigate, markReady } = setup({ protocols: '50014', templateId: '1' });
    fx.componentInstance.onMarkCompleted([700]);
    expect(markReady).toHaveBeenCalledWith(700);
    expect(navigate).toHaveBeenCalledWith(['/analitica/procesamiento']);
  });

  it('"Volver a procesamiento" (back) navega a procesamiento', () => {
    const { fx, navigate } = setup({ protocols: '50014', templateId: '1' });
    fx.componentInstance.back();
    expect(navigate).toHaveBeenCalledWith(['/analitica/procesamiento']);
  });
});
