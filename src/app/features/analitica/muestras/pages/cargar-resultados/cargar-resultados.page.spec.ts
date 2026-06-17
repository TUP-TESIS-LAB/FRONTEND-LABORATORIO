import { describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { CargarResultadosPage } from './cargar-resultados.page';
import { PlanillaGridBuilderService } from '../../services/planilla-grid-builder.service';
import { ResultadosApiService } from '../../services/resultados-api.service';
import type { PlanillaGrid } from '../../models/resultado.model';

const GRID: PlanillaGrid = {
  templateId: 1, templateName: 'prueba',
  columns: [{ protocolId: 50014, label: 'María López' }, { protocolId: 50015, label: 'Roberto Fernández' }],
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

function setup(query: Record<string, string | null>): {
  fx: ComponentFixture<CargarResultadosPage>; build: ReturnType<typeof vi.fn>;
} {
  const build = vi.fn().mockReturnValue(of(GRID));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CargarResultadosPage],
    providers: [
      provideNoopAnimations(),
      MessageService,
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (k: string) => query[k] ?? null } } } },
      { provide: PlanillaGridBuilderService, useValue: { build } },
      { provide: ResultadosApiService, useValue: { batchUpdate: vi.fn().mockReturnValue(of([])), markReady: vi.fn().mockReturnValue(of({})) } },
    ],
  });
  TestBed.overrideTemplate(CargarResultadosPage, '<span>{{ grid()?.templateName }}</span>');
  const fx = TestBed.createComponent(CargarResultadosPage);
  fx.detectChanges();
  return { fx, build };
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

  it('el resumen cuenta solo determinaciones persistibles (GAP-P5)', () => {
    const { fx } = setup({ protocols: '50014,50015', templateId: '1' });
    const items = fx.componentInstance.resumenItems();
    // Solo 50014 tiene resultId/determinationId reales → un item, completo (1/1).
    expect(items.length).toBe(1);
    expect(items[0].filled).toBe(1);
    expect(items[0].total).toBe(1);
  });
});
