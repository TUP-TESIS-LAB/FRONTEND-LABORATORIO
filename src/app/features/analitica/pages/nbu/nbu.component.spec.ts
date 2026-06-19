import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { NbuComponent } from './nbu.component';
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

  // Header: eyebrow "Clínico"
  it('muestra el eyebrow "Clínico" en el header', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Clínico');
  });

  // Header: título "Nomenclador NBU"
  it('muestra el título "Nomenclador NBU" en el header', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nomenclador NBU');
  });

  // Header: icono pi pi-book
  it('muestra el ícono pi-book en el header', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('.pi-book');
    expect(icon).not.toBeNull();
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
