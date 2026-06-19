import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { NbuParticularTabComponent } from './nbu-particular-tab.component';
import {
  NOMENCLADOR_FEATURE_KEY,
  initialNomencladorState,
} from '../../store/nomenclador/nomenclador.state';
import { saveValorUb, setOverride } from '../../store/nomenclador/nomenclador.actions';

// ── helpers ───────────────────────────────────────────────────────────────────

function setup(valorUb = 350, overrides: Record<number, number> = {}) {
  const catalog = [
    {
      id: 1,
      shortCode: 'HEMO',
      name: 'Hemograma',
      familyName: 'Hematología',
      nbuCode: 'NBU-001',
      cantidadUb: 10,
    },
  ];
  const initialState = {
    [NOMENCLADOR_FEATURE_KEY]: {
      ...initialNomencladorState,
      selectedVersionId: 'v2024',
      catalog,
      particular: { valorUb, overrides },
    },
  };
  TestBed.configureTestingModule({
    imports: [NbuParticularTabComponent],
    providers: [
      provideMockStore({ initialState }),
      provideNoopAnimations(),
    ],
  });
  const store = TestBed.inject(MockStore);
  const fixture = TestBed.createComponent(NbuParticularTabComponent);
  return { fixture, store };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('NbuParticularTabComponent', () => {

  it('smoke: renderiza el componente sin errores', () => {
    const { fixture } = setup();
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('guarda valor U.B. despachando saveValorUb({ valor })', () => {
    const { fixture, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();

    fixture.componentInstance.guardarValor(400);

    expect(spy).toHaveBeenCalledWith(saveValorUb({ valor: 400 }));
  });

  it('confirmar override despacha setOverride({ analysisId, precio })', () => {
    const { fixture, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();

    fixture.componentInstance.confirmarOverride(1, 9999);

    expect(spy).toHaveBeenCalledWith(setOverride({ analysisId: 1, precio: 9999 }));
  });

  it('limpiar override despacha setOverride({ analysisId, precio: null })', () => {
    const { fixture, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();

    fixture.componentInstance.limpiarOverride(1);

    expect(spy).toHaveBeenCalledWith(setOverride({ analysisId: 1, precio: null }));
  });

  it('muestra columnas de cabecera en la tabla', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Código');
    expect(text).toContain('Análisis');
    expect(text).toContain('Familia');
    expect(text).toContain('Cant. U.B.');
    expect(text).toContain('Precio particular');
    expect(text).toContain('Origen');
  });

  it('muestra la card de valor U.B. con el valor del store', () => {
    const { fixture } = setup(350);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // La card debe mostrar el valor U.B. inicial (350)
    expect(el.textContent).toContain('350');
  });

  it('muestra badge Manual en filas con override', () => {
    const { fixture } = setup(350, { 1: 9999 });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Manual');
  });

  it('muestra Sin U.B. cuando cantidadUb es null', () => {
    const { fixture, store } = setup(350);
    store.setState({
      [NOMENCLADOR_FEATURE_KEY]: {
        ...initialNomencladorState,
        selectedVersionId: 'v2024',
        catalog: [{ id: 2, shortCode: 'XRNA', name: 'Sin UB', familyName: null, nbuCode: null, cantidadUb: null }],
        particular: { valorUb: 350, overrides: {} },
      },
    });
    store.refreshState();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Sin U.B.');
  });

  it('confirmarOverride resetea editing a null', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    fixture.componentInstance.editing.set(1);
    fixture.componentInstance.confirmarOverride(1, 500);

    expect(fixture.componentInstance.editing()).toBeNull();
  });
});
