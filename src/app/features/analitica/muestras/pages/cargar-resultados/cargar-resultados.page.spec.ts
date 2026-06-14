import { describe, expect, it } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { CargarResultadosPage } from './cargar-resultados.page';
import { selectGrid, selectResultadosLoading, selectResultadosError } from '../../store/resultados/resultados.selectors';
import type { ResultGrid } from '../../models/resultado.model';

const SMOKE_TEMPLATE = `<section><h1>Cargar resultados</h1><p>{{ bannerText }}</p></section>`;
const grid: ResultGrid = { protocolId: 9, sections: [] };

function setup(): { fx: ComponentFixture<CargarResultadosPage>; store: MockStore } {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CargarResultadosPage],
    providers: [
      provideNoopAnimations(),
      MessageService,
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'protocolId' ? '9' : null) } } } },
      provideMockStore({ selectors: [
        { selector: selectGrid, value: grid },
        { selector: selectResultadosLoading, value: false },
        { selector: selectResultadosError, value: null },
      ] }),
    ],
  });
  TestBed.overrideTemplate(CargarResultadosPage, SMOKE_TEMPLATE);
  const fx = TestBed.createComponent(CargarResultadosPage);
  const store = TestBed.inject(MockStore);
  fx.detectChanges();
  return { fx, store };
}

describe('CargarResultadosPage (smoke)', () => {
  it('expone protocolId leído de la ruta', () => {
    const { fx } = setup();
    expect(fx.componentInstance.protocolId).toBe(9);
  });
  it('tiene el texto del banner UX (pendiente)', () => {
    const { fx } = setup();
    expect(fx.componentInstance.bannerText.toLowerCase()).toContain('demo');
  });
});
