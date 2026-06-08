import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { WorklistPage } from './worklist.page';
import { MockSamplesService } from '../../services/mock-samples.service';

/**
 * Minimal test template: includes only the header (h1 + counters).
 * Sub-components (ScanBar, BatchMenu, SampleTable, TransitionDialog) use
 * Angular 17+ signal inputs which are not reflected in ɵcmp.inputs during
 * JIT compilation (the mode used by vitest). The full template would cause
 * NG0303 / NG0950 errors. The smoke test validates component logic + header
 * rendering; the full template integration is covered by e2e / Karma.
 */
const SMOKE_TEMPLATE = `
<section class="worklist-page">
  <header class="worklist-header">
    <div>
      <h1>{{ config().title }}</h1>
      <p class="subtitle">{{ config().sub }}</p>
    </div>
    <div class="stats">
      <span class="chip">{{ total() }} · {{ config().countLabel }}</span>
      <span class="chip" [class.chip-selected]="selectedCount() > 0">
        {{ selectedCount() }} · seleccionada(s) de {{ total() }}
      </span>
    </div>
  </header>
</section>
`;

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
}

function setup(screenKey: 'recoleccion' | 'traslado' | 'procesamiento' | 'descarte'): ComponentFixture<WorklistPage> {
  installLocalStorageMock();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [WorklistPage],
    providers: [
      provideNoopAnimations(),
      MockSamplesService,
      { provide: ActivatedRoute, useValue: { snapshot: { data: { screenKey } } } },
    ],
  });
  TestBed.overrideTemplate(WorklistPage, SMOKE_TEMPLATE);
  const fixture = TestBed.createComponent(WorklistPage);
  fixture.detectChanges();
  return fixture;
}

describe('WorklistPage (smoke)', () => {
  it('renderiza Recolección con título y count > 0', () => {
    const fx = setup('recoleccion');
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Recolección');
    expect(fx.componentInstance.total()).toBe(16);
  });

  it('renderiza Traslado con título correcto', () => {
    const fx = setup('traslado');
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Traslado');
    expect(fx.componentInstance.total()).toBe(10);
  });

  it('renderiza Procesamiento con título correcto', () => {
    const fx = setup('procesamiento');
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Procesamiento');
    expect(fx.componentInstance.total()).toBe(9);
  });

  it('renderiza Descarte con título correcto', () => {
    const fx = setup('descarte');
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Descarte');
    expect(fx.componentInstance.total()).toBe(7);
  });

  it('toggleRow selecciona y deselecciona', () => {
    const fx = setup('recoleccion');
    const cmp = fx.componentInstance;
    const firstId = cmp.rows()[0].id;
    cmp.toggleRow(firstId);
    expect(cmp.selectedCount()).toBe(1);
    cmp.toggleRow(firstId);
    expect(cmp.selectedCount()).toBe(0);
  });

  it('query filtra rows en vivo', () => {
    const fx = setup('recoleccion');
    const cmp = fx.componentInstance;
    const sample = cmp.rows()[0];
    cmp.setQuery(sample.barcode);
    expect(cmp.rows().length).toBe(1);
    expect(cmp.rows()[0].barcode).toBe(sample.barcode);
  });
});
