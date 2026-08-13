import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { FilterBarComponent, FilterBarConfig, FilterBarValue } from '@shared/ui/components/filter-bar/filter-bar.component';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { NbuComponent } from './nbu.component';
import { NbuCatalogoTabComponent } from './nbu-catalogo-tab/nbu-catalogo-tab.component';
import { NbuParticularTabComponent } from './nbu-particular-tab.component';
import {
  NOMENCLADOR_FEATURE_KEY,
  initialNomencladorState,
} from '../../store/nomenclador/nomenclador.state';
import {
  loadNomenclador,
  selectNbuVersion,
} from '../../store/nomenclador/nomenclador.actions';
import { selectNbuVersions, selectSelectedVersionId, selectNomencladorPending } from '../../store/nomenclador/nomenclador.selectors';
import { NbuVersion } from '../../models/nomenclador.model';

// ── helpers ───────────────────────────────────────────────────────────────────

const VERSIONS: NbuVersion[] = [
  { id: 'v2024', label: 'NBU 2024', vigente: true },
  { id: 'v2021', label: 'NBU 2021', vigente: false },
];

/**
 * Orden real del backend: la vigente NO es la primera de la lista. Reproduce el payload de
 * GET /api/v1/analitica/nbu-versions, donde la más vieja (2012) viene primero.
 */
const VERSIONS_VIGENTE_AL_FINAL: NbuVersion[] = [
  { id: '1', label: 'NBU NBU-2012-16', vigente: false },
  { id: '2', label: 'NBU NBU-ANEXO-2023', vigente: false },
  { id: '3', label: 'NBU NBU-ANEXO-2024 — vigente', vigente: true },
];

/*
 * ── Stubs de los componentes hijos ───────────────────────────────────────────
 *
 * Lo que se prueba acá es el shell de la pantalla: el header con el selector de versión y el
 * switch de tabs. Los hijos reales (`ui-page-header`, `ui-filter-bar` y los dos tabs, que a su
 * vez montan `ui-table`) declaran inputs REQUERIDOS con la API de signals (`input.required()`)
 * y sólo aportan ruido a estos casos, así que se reemplazan por stubs con la misma API pública.
 *
 * Los stubs declaran sus inputs con los decoradores `@Input()`/`@Output()` A PROPÓSITO, no con
 * `input()`: este archivo se corre con `npx vitest run`, que no pasa por el compilador AOT de
 * Angular y cae a JIT, y en JIT los inputs basados en signals NO se registran (de ahí los
 * NG0303 "isn't a known property" y los NG0950 de los inputs requeridos). Los decoradores sí se
 * registran en JIT, con lo cual los stubs bindean bien en ambos runners.
 *
 * No se usa NO_ERRORS_SCHEMA: apagaría la validación de TODO el template y taparía regresiones
 * reales del `<select>`, que es justo lo que estos tests tienen que proteger.
 */

@Component({ selector: 'ui-page-header', standalone: true, template: '<h1>{{ heading }}</h1><ng-content />' })
class PageHeaderStub {
  @Input() heading = '';
  @Input() subtitle = '';
}

@Component({ selector: 'ui-filter-bar', standalone: true, template: '' })
class FilterBarStub {
  @Input() config?: FilterBarConfig;
  @Input() resetKey?: unknown;
  @Output() valueChange = new EventEmitter<FilterBarValue>();
}

@Component({ selector: 'lab-nbu-catalogo-tab', standalone: true, template: 'catalogo-stub' })
class CatalogoTabStub {
  @Input() search = '';
  @Input() families: readonly string[] = [];
}

@Component({ selector: 'lab-nbu-particular-tab', standalone: true, template: 'particular-stub' })
class ParticularTabStub {
  @Input() search = '';
  @Input() families: readonly string[] = [];
}

function setup(overrideState: Partial<typeof initialNomencladorState> = {}) {
  const initialState = {
    [NOMENCLADOR_FEATURE_KEY]: {
      ...initialNomencladorState,
      ...overrideState,
    },
  };
  TestBed.configureTestingModule({
    imports: [NbuComponent],
    providers: [
      provideMockStore({
        initialState,
        selectors: [
          { selector: selectNbuVersions, value: overrideState.nbuVersions ?? [] },
          { selector: selectSelectedVersionId, value: overrideState.selectedVersionId ?? null },
          { selector: selectNomencladorPending, value: overrideState.pending ?? false },
        ],
      }),
    ],
  });
  TestBed.overrideComponent(NbuComponent, {
    remove: {
      imports: [PageHeaderComponent, FilterBarComponent, NbuCatalogoTabComponent, NbuParticularTabComponent],
    },
    add: {
      imports: [PageHeaderStub, FilterBarStub, CatalogoTabStub, ParticularTabStub],
    },
  });
  const store = TestBed.inject(MockStore);
  const fixture = TestBed.createComponent(NbuComponent);
  return { fixture, store };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('NbuComponent', () => {

  it('smoke: renderiza el componente sin errores', () => {
    const { fixture } = setup();
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  // (a) ngOnInit despacha loadNomenclador()
  it('ngOnInit despacha loadNomenclador()', () => {
    const { fixture, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges(); // triggers ngOnInit
    expect(spy).toHaveBeenCalledWith(loadNomenclador());
  });

  // (b) cambiar versión en el select despacha selectNbuVersion({ versionId })
  it('cambiar la versión en el selector despacha selectNbuVersion({ versionId })', () => {
    const { fixture, store } = setup({
      nbuVersions: VERSIONS,
      selectedVersionId: 'v2024',
    });
    const spy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();

    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('[data-testid="version-select"]');
    expect(select).not.toBeNull();

    select!.value = 'v2021';
    select!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(selectNbuVersion({ versionId: 'v2021' }));
  });

  // Selector de versión muestra las opciones del store
  it('el selector de versión muestra las versiones disponibles', () => {
    const { fixture } = setup({ nbuVersions: VERSIONS, selectedVersionId: 'v2024' });
    fixture.detectChanges();

    const options = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLOptionElement>('[data-testid="version-select"] option');
    const values = Array.from(options).map(o => o.value);
    expect(values).toContain('v2024');
    expect(values).toContain('v2021');
  });

  // Preselección: el <select> tiene que quedar realmente parado sobre la versión vigente.
  // Regresión: antes se bindeaba [value] en el <select> y el navegador lo descartaba porque
  // las <option> del @for todavía no existían, con lo que quedaba seleccionada la MÁS VIEJA.
  it('preselecciona la versión vigente aunque no sea la primera de la lista', () => {
    const { fixture } = setup({
      nbuVersions: VERSIONS_VIGENTE_AL_FINAL,
      selectedVersionId: '3',
    });
    fixture.detectChanges();

    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('[data-testid="version-select"]');
    expect(select!.value).toBe('3');
    expect(select!.selectedOptions[0].textContent).toContain('NBU-ANEXO-2024');
  });

  it('la opción vigente es la única marcada como selected', () => {
    const { fixture } = setup({
      nbuVersions: VERSIONS_VIGENTE_AL_FINAL,
      selectedVersionId: '3',
    });
    fixture.detectChanges();

    const options = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLOptionElement>('[data-testid="version-select"] option');
    const seleccionadas = Array.from(options).filter(o => o.selected).map(o => o.value);
    expect(seleccionadas).toEqual(['3']);
  });

  it('sin versiones muestra el placeholder y no rompe la pantalla', () => {
    const { fixture } = setup({ nbuVersions: [], selectedVersionId: null });
    expect(() => fixture.detectChanges()).not.toThrow();

    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('[data-testid="version-select"]');
    expect(select!.textContent).toContain('Sin versiones disponibles');
  });

  // NOTA: acá había un caso `muestra el eyebrow "Clínico" en el header`. Se eliminó porque
  // probaba una función que ya no existe: `ui-page-header` sólo expone `heading` y `subtitle`,
  // y el texto "Clínico" no está en ninguna parte de la pantalla. El caso quedó colgado cuando
  // se migró el header a `ui-page-header` y nunca se actualizó.

  // Header: título "Nomenclador NBU"
  it('muestra el título "Nomenclador NBU" en el header', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nomenclador NBU');
  });

  // Header: sin ícono junto al título (convención de la app — se removieron)
  it('no muestra ícono pi-book junto al título', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('.pi-book');
    expect(icon).toBeNull();
  });

  // (c) tab-switching sigue funcionando
  it('tab activo por defecto es "Catálogo de análisis"', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    // El tab button activo debe estar visible
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[type="button"]');
    const catalogBtn = Array.from(buttons).find(b => b.textContent?.includes('Catálogo de análisis'));
    expect(catalogBtn).not.toBeUndefined();
  });

  it('al hacer clic en "Precio particular" cambia de tab', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[type="button"]');
    const particularBtn = Array.from(buttons).find(b => b.textContent?.includes('Precio particular'));
    expect(particularBtn).not.toBeUndefined();
    particularBtn!.click();
    fixture.detectChanges();

    // La instancia del componente debe reflejar el cambio de tab
    expect(fixture.componentInstance.tab()).toBe('particular');
  });

  // (d) Resalte del tab activo
  it('tab "catálogo" activo tiene borderBottomColor con brand-primary y color con brand-primary', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const catalogBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="tab-catalogo"]');
    const particularBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="tab-particular"]');
    expect(catalogBtn).not.toBeNull();
    expect(particularBtn).not.toBeNull();

    // Tab activo por defecto: catálogo
    expect(catalogBtn!.style.borderBottomColor).not.toBe('transparent');
    expect(particularBtn!.style.borderBottomColor).toBe('transparent');
  });

  it('al cambiar a "particular" el estilo activo se mueve al botón correcto', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const particularBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="tab-particular"]');
    const catalogBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="tab-catalogo"]');
    expect(particularBtn).not.toBeNull();

    particularBtn!.click();
    fixture.detectChanges();

    // Ahora particular está activo; catálogo pasa a transparente
    expect(particularBtn!.style.borderBottomColor).not.toBe('transparent');
    expect(catalogBtn!.style.borderBottomColor).toBe('transparent');
  });
});
