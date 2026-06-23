import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TokenService } from '@core/auth/token.service';
import { NbuCatalogoTabComponent } from './nbu-catalogo-tab.component';
import {
  NOMENCLADOR_FEATURE_KEY,
  initialNomencladorState,
} from '../../../store/nomenclador/nomenclador.state';
import { loadConfigResumen, loadDeterminations } from '../../../store/nomenclador/nomenclador.actions';
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

function setup(
  initialRows: CatalogRow[] = [],
  dets: Record<number, Determination[]> = {},
  roles: string[] = ['ADMINISTRADOR'],
) {
  const initialState = {
    [NOMENCLADOR_FEATURE_KEY]: {
      ...initialNomencladorState,
      catalog: initialRows,
      selectedVersionId: 'v2024',
      determinationsByAnalysis: dets,
    },
  };
  const tokenStub: Partial<TokenService> = { getRoles: () => roles };
  TestBed.configureTestingModule({
    imports: [NbuCatalogoTabComponent],
    providers: [
      provideMockStore({ initialState }),
      provideNoopAnimations(),
      { provide: TokenService, useValue: tokenStub },
    ],
  });
  const store = TestBed.inject(MockStore);
  const fixture = TestBed.createComponent(NbuCatalogoTabComponent);
  // acceso a métodos protected para tests de lógica
  const cmp = fixture.componentInstance as unknown as {
    onExpand(row: CatalogRow): void;
    onAction(e: { key: string; row: unknown }): void;
    determinationsFor(id: number): Determination[] | null;
    ub(row: CatalogRow): string;
    isAdmin(): boolean;
    rowActions: readonly { key: string; hidden?: (row: unknown) => boolean }[];
  };
  return { fixture, store, cmp };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('NbuCatalogoTabComponent (ui-table)', () => {

  it('smoke: renderiza el componente sin errores', () => {
    const { fixture } = setup();
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('usa el componente genérico ui-table (no <table> inline)', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ui-table')).not.toBeNull();
  });

  it('muestra las columnas: Código, Análisis, Familia, Cód. NBU, Cantidad U.B.', () => {
    const { fixture } = setup([catalogRow()]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Código');
    expect(text).toContain('Análisis');
    expect(text).toContain('Familia');
    expect(text).toContain('Cód. NBU');
    expect(text).toContain('Cantidad U.B.');
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
    expect(el.textContent).toContain('5,00');
  });

  it('muestra "—" en Familia y Cód. NBU cuando son null', () => {
    const row = catalogRow({ id: 1, familyName: null, nbuCode: null });
    const { fixture } = setup([row]);
    fixture.detectChanges();
    const dashes = (fixture.nativeElement as HTMLElement).textContent?.match(/—/g) ?? [];
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('ub(): formatea cantidadUb a 2 decimales con coma, o "—" si es null', () => {
    const { cmp } = setup();
    expect(cmp.ub(catalogRow({ cantidadUb: 1.5 }))).toBe('1,50');
    expect(cmp.ub(catalogRow({ cantidadUb: 10 }))).toBe('10,00');
    expect(cmp.ub(catalogRow({ cantidadUb: null }))).toBe('—');
  });

  it('onExpand(): despacha loadDeterminations con el analysisId', () => {
    const { store, cmp } = setup([catalogRow({ id: 7 })]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    cmp.onExpand(catalogRow({ id: 7 }));
    expect(dispatchSpy).toHaveBeenCalledWith(loadDeterminations({ analysisId: 7 }));
  });

  it('onExpand(): despacha también loadConfigResumen con el analysisId', () => {
    const { store, cmp } = setup([catalogRow({ id: 7 })]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    cmp.onExpand(catalogRow({ id: 7 }));
    expect(dispatchSpy).toHaveBeenCalledWith(loadConfigResumen({ analysisId: 7 }));
  });

  it('isAdmin(): true cuando el token tiene rol ADMINISTRADOR; la acción "config" no se oculta', () => {
    const { cmp } = setup([catalogRow()], {}, ['ADMINISTRADOR']);
    expect(cmp.isAdmin()).toBe(true);
    const configAction = cmp.rowActions.find(a => a.key === 'config');
    expect(configAction).toBeDefined();
    expect(configAction?.hidden?.({})).toBe(false);
  });

  it('isAdmin(): false sin el rol; la acción "config" queda oculta', () => {
    const { cmp } = setup([catalogRow()], {}, ['SECRETARIA']);
    expect(cmp.isAdmin()).toBe(false);
    const configAction = cmp.rowActions.find(a => a.key === 'config');
    expect(configAction?.hidden?.({})).toBe(true);
  });

  it('onAction("config"): emite configRequested con la fila', () => {
    const { fixture, cmp } = setup([catalogRow({ id: 7 })]);
    const row = catalogRow({ id: 7 });
    let emitted: CatalogRow | undefined;
    fixture.componentInstance.configRequested.subscribe((r: CatalogRow) => (emitted = r));
    cmp.onAction({ key: 'config', row });
    expect(emitted).toEqual(row);
  });

  it('onExpand(): despacha loadDeterminations solo una vez por análisis', () => {
    const { store, cmp } = setup([catalogRow({ id: 7 })]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    cmp.onExpand(catalogRow({ id: 7 }));
    cmp.onExpand(catalogRow({ id: 7 }));
    cmp.onExpand(catalogRow({ id: 7 }));
    const calls = dispatchSpy.mock.calls.filter(c => (c[0] as unknown as { type: string }).type === loadDeterminations.type);
    expect(calls.length).toBe(1);
  });

  it('determinationsFor(): null si no cargado, array si está en el store', () => {
    const dets: Determination[] = [{ id: 10, name: 'Glóbulos rojos' }];
    const { cmp } = setup([catalogRow({ id: 7 })], { 7: dets });
    expect(cmp.determinationsFor(99)).toBeNull();
    expect(cmp.determinationsFor(7)).toEqual(dets);
  });
});
