import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { NbuCatalogoTabComponent } from './nbu-catalogo-tab.component';
import {
  NOMENCLADOR_FEATURE_KEY,
  initialNomencladorState,
} from '../../../store/nomenclador/nomenclador.state';
import { loadDeterminations } from '../../../store/nomenclador/nomenclador.actions';
import { CatalogRow, Determination } from '../../../models/nomenclador.model';

// ── helpers ───────────────────────────────────────────────────────────────────

function catalogRow(over: Partial<CatalogRow> = {}): CatalogRow {
  return {
    id: 1,
    shortCode: 'HEMO',
    name: 'Hemograma',
    familyName: 'Hematología',
    nbuCode: 'NBU-001',
    cantidadUb: 10,
    ...over,
  };
}

function determination(over: Partial<Determination> = {}): Determination {
  return { id: 1, name: 'Glóbulos rojos', ...over };
}

function setup(initialRows: CatalogRow[] = []) {
  const initialState = {
    [NOMENCLADOR_FEATURE_KEY]: {
      ...initialNomencladorState,
      catalog: initialRows,
      selectedVersionId: 'v2024',
    },
  };
  TestBed.configureTestingModule({
    imports: [NbuCatalogoTabComponent],
    providers: [
      provideMockStore({ initialState }),
      provideNoopAnimations(),
    ],
  });
  const store = TestBed.inject(MockStore);
  const fixture = TestBed.createComponent(NbuCatalogoTabComponent);
  return { fixture, store };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('NbuCatalogoTabComponent', () => {

  it('smoke: renderiza el componente sin errores', () => {
    const { fixture } = setup();
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('muestra las columnas de cabecera: Código, Análisis, Familia, Cód. NBU, Cantidad U.B., Determinaciones', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Código');
    expect(text).toContain('Análisis');
    expect(text).toContain('Familia');
    expect(text).toContain('Cód. NBU');
    expect(text).toContain('Cantidad U.B.');
    expect(text).toContain('Determinaciones');
  });

  it('renderiza una fila de análisis con sus datos', () => {
    const row = catalogRow({ id: 42, shortCode: 'GLUC', name: 'Glucosa', familyName: 'Bioquímica', nbuCode: 'NBU-099', cantidadUb: 5 });
    const { fixture } = setup([row]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('GLUC');
    expect(el.textContent).toContain('Glucosa');
    expect(el.textContent).toContain('Bioquímica');
    expect(el.textContent).toContain('NBU-099');
    expect(el.textContent).toContain('5');
  });

  it('muestra "—" en Familia y Cód. NBU cuando son null', () => {
    const row = catalogRow({ id: 1, familyName: null, nbuCode: null });
    const { fixture } = setup([row]);
    fixture.detectChanges();
    const cells = (fixture.nativeElement as HTMLElement).querySelectorAll('td');
    const texts = Array.from(cells).map(c => c.textContent?.trim());
    // Esperamos al menos 2 guiones para familia y nbuCode
    const dashes = texts.filter(t => t === '—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('muestra "—" en Cantidad U.B. cuando cantidadUb es null', () => {
    const row = catalogRow({ id: 1, cantidadUb: null });
    const { fixture } = setup([row]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('—');
  });

  it('al expandir una fila despacha loadDeterminations con el analysisId', () => {
    const row = catalogRow({ id: 7, shortCode: 'TGO', name: 'TGO', cantidadUb: 3 });
    const { fixture, store } = setup([row]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();

    const toggleBtn = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="expand-btn"]') as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();
    toggleBtn.click();
    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(loadDeterminations({ analysisId: 7 }));
  });

  it('muestra "Cargando…" en el panel expandido cuando las determinaciones son null', () => {
    const row = catalogRow({ id: 7 });
    // Estado inicial: determinationsByAnalysis vacío → selectDeterminations(7) devuelve null
    const { fixture } = setup([row]);
    fixture.detectChanges();

    const toggleBtn = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="expand-btn"]') as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cargando');
  });

  it('muestra las determinaciones cuando están cargadas', () => {
    const row = catalogRow({ id: 7 });
    const dets: Determination[] = [
      determination({ id: 10, name: 'Glóbulos rojos' }),
      determination({ id: 11, name: 'Leucocitos' }),
    ];
    // Preinicializamos el estado con las determinaciones ya en el store
    const { fixture, store } = setup([row]);
    store.setState({
      [NOMENCLADOR_FEATURE_KEY]: {
        ...initialNomencladorState,
        catalog: [row],
        selectedVersionId: 'v2024',
        determinationsByAnalysis: { 7: dets },
      },
    });
    store.refreshState();
    fixture.detectChanges();

    const toggleBtn = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="expand-btn"]') as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Glóbulos rojos');
    expect(text).toContain('Leucocitos');
  });

  it('muestra "Sin determinaciones" cuando el array de determinaciones está vacío', () => {
    const row = catalogRow({ id: 7 });
    // Determinaciones cargadas pero vacías
    const { fixture, store } = setup([row]);
    store.setState({
      [NOMENCLADOR_FEATURE_KEY]: {
        ...initialNomencladorState,
        catalog: [row],
        selectedVersionId: 'v2024',
        determinationsByAnalysis: { 7: [] },
      },
    });
    store.refreshState();
    fixture.detectChanges();

    const toggleBtn = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="expand-btn"]') as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin determinaciones');
  });

  it('segunda expansión de la misma fila la colapsa (toggle)', () => {
    const row = catalogRow({ id: 7 });
    const { fixture } = setup([row]);
    fixture.detectChanges();

    const toggleBtn = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="expand-btn"]') as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();
    // panel abierto: existe expansion-row
    expect((fixture.nativeElement as HTMLElement).querySelector('.expansion-row')).not.toBeNull();

    toggleBtn.click();
    fixture.detectChanges();
    // panel cerrado: NO existe expansion-row
    expect((fixture.nativeElement as HTMLElement).querySelector('.expansion-row')).toBeNull();
  });

  it('muestra el nbuCode cuando el reducer lo parchea en el catalog tras expandir', () => {
    // Simula el estado tras loadDeterminationsSuccess: la fila ya tiene nbuCode seteado
    const row = catalogRow({ id: 7, nbuCode: null });
    const { fixture, store } = setup([row]);
    fixture.detectChanges();

    // El reducer parchea: actualizamos el estado del store con nbuCode ya seteado
    store.setState({
      [NOMENCLADOR_FEATURE_KEY]: {
        ...initialNomencladorState,
        catalog: [{ ...row, nbuCode: '475' }],
        selectedVersionId: 'v2024',
        determinationsByAnalysis: {},
      },
    });
    store.refreshState();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('475');
  });

  it('loadDeterminations se despacha solo una vez aunque se expanda/colapse/expanda', () => {
    const row = catalogRow({ id: 7 });
    const { fixture, store } = setup([row]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();

    const toggleBtn = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="expand-btn"]') as HTMLButtonElement;
    // Primera expansión
    toggleBtn.click();
    fixture.detectChanges();
    // Colapsar
    toggleBtn.click();
    fixture.detectChanges();
    // Segunda expansión
    toggleBtn.click();
    fixture.detectChanges();

    const calls = dispatchSpy.mock.calls.filter(
      c => c[0].type === loadDeterminations.type,
    );
    expect(calls.length).toBe(1);
  });
});
