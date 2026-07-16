import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { AnalysisPickerComponent, PickerRow } from './analysis-picker.component';
import { AnalysisService } from '../../services/analysis.service';
import { Analysis } from '../../models/atencion.model';

const a = (over: Partial<Analysis>): Analysis => ({
  id: 1, shortCode: '1001', name: 'Hemograma', familyName: 'Hematología', ubCount: 3, ...over,
});

describe('AnalysisPickerComponent', () => {
  let fixture: ComponentFixture<AnalysisPickerComponent>;
  let api: {
    findByShortCode: ReturnType<typeof vi.fn>;
    searchByShortCodePrefix: ReturnType<typeof vi.fn>;
    searchByName: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      findByShortCode: vi.fn(),
      searchByShortCodePrefix: vi.fn(),
      searchByName: vi.fn(),
      search: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [AnalysisPickerComponent],
      providers: [{ provide: AnalysisService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalysisPickerComponent);
    fixture.detectChanges();
  });

  // ── NEW-B2: Enter selecciona el único resultado filtrado ──────────────────
  it('NEW-B2: Enter con exactamente UN resultado lo agrega y limpia las sugerencias', () => {
    const c = fixture.componentInstance;
    c.suggestions.set([a({ id: 5, shortCode: '1001', name: 'Hemograma' })]);
    c.onKeyup(new KeyboardEvent('keyup', { key: 'Enter' }));
    expect(c.items().map((x) => x.id)).toEqual([5]);
    expect(c.suggestions()).toEqual([]);
  });

  it('NEW-B2: Enter con >1 resultados NO agrega nada (no disruptivo)', () => {
    const c = fixture.componentInstance;
    c.suggestions.set([a({ id: 5, shortCode: '1001' }), a({ id: 6, shortCode: '1002', name: 'Glucemia' })]);
    (c as any).autoModel = 'gluc'; // texto no-numérico → handleEnter no agrega
    c.onKeyup(new KeyboardEvent('keyup', { key: 'Enter' }));
    expect(c.items()).toHaveLength(0);
  });

  it('NEW-B2: Enter con 0 resultados y código numérico exacto sigue usando findByShortCode', () => {
    api.findByShortCode.mockReturnValue(of(a({ id: 9, shortCode: '777' })));
    const c = fixture.componentInstance;
    c.suggestions.set([]);
    (c as any).autoModel = '777';
    c.onKeyup(new KeyboardEvent('keyup', { key: 'Enter' }));
    expect(api.findByShortCode).toHaveBeenCalledWith('777');
    expect(c.items().map((x) => x.id)).toEqual([9]);
  });

  it('NEW-E: en readOnly no se renderiza el buscador ni el botón de quitar', () => {
    const f = TestBed.createComponent(AnalysisPickerComponent);
    f.componentRef.setInput('readOnly', true);
    f.componentRef.setInput('initialItems', [
      { id: 3, shortCode: '1001', name: 'Hemograma', familyName: null, ubCount: null, isAuthorized: true },
    ]);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('p-autocomplete')).toBeNull();
    // El botón de quitar (trash) no debe estar; el ojo de detalle sí puede estar.
    const trash = el.querySelector('.pi-trash');
    expect(trash).toBeNull();
  });

  it('detects numeric input as shortCode and uses findByShortCode', () => {
    api.findByShortCode.mockReturnValue(of(a({ id: 5, shortCode: '1001' })));
    fixture.componentInstance.handleEnter('1001');
    expect(api.findByShortCode).toHaveBeenCalledWith('1001');
    expect(fixture.componentInstance.items()).toHaveLength(1);
  });

  // ── KAN-246: el buscador del picker usa siempre la búsqueda unificada ─────
  // (nombre / código interno / código NBU, match "contiene") — sin heurística
  // por tipo de caracter de la query.
  it('texto → usa search() (búsqueda unificada) para las sugerencias', () => {
    api.search.mockReturnValue(of([a({ id: 5 }), a({ id: 6, shortCode: '1002', name: 'Glucemia' })]));
    fixture.componentInstance.onAutoCompleteSearch({ query: 'gluc' } as any);
    expect(api.search).toHaveBeenCalledWith('gluc');
    expect(api.searchByName).not.toHaveBeenCalled();
    expect(api.searchByShortCodePrefix).not.toHaveBeenCalled();
    expect(fixture.componentInstance.suggestions().length).toBe(2);
  });

  it('numérico → también usa search() (antes usaba searchByShortCodePrefix por heurística)', () => {
    api.search.mockReturnValue(of([a({ id: 5, shortCode: '1001' }), a({ id: 6, shortCode: '1002' })]));
    fixture.componentInstance.onAutoCompleteSearch({ query: '100' } as any);
    expect(api.search).toHaveBeenCalledWith('100');
    expect(api.searchByShortCodePrefix).not.toHaveBeenCalled();
    expect(api.searchByName).not.toHaveBeenCalled();
    expect(fixture.componentInstance.suggestions().length).toBe(2);
  });

  it('query vacía → limpia sugerencias sin llamar a search()', () => {
    fixture.componentInstance.onAutoCompleteSearch({ query: '  ' } as any);
    expect(api.search).not.toHaveBeenCalled();
    expect(fixture.componentInstance.suggestions()).toEqual([]);
  });

  it('error en search() → sugerencias vacías (no rompe el picker)', () => {
    api.search.mockReturnValue(new Observable((sub) => sub.error(new Error('boom'))));
    fixture.componentInstance.onAutoCompleteSearch({ query: 'xx' } as any);
    expect(fixture.componentInstance.suggestions()).toEqual([]);
  });

  it('addAnalysis blocks duplicates by shortCode', () => {
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: '1001' }));
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: '1001' }));
    expect(fixture.componentInstance.items().length).toBe(1);
    expect(fixture.componentInstance.errorText()).toContain('ya está');
  });

  it('removeAnalysis filters by id and emits analysisRemoved', () => {
    const emitted: number[] = [];
    fixture.componentInstance.analysisRemoved.subscribe((id) => emitted.push(id));
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: '1001' }));
    fixture.componentInstance.addAnalysis(a({ id: 2, shortCode: '1002', name: 'Glucemia' }));
    fixture.componentInstance.removeAnalysis(1);
    expect(fixture.componentInstance.items().map((x) => x.id)).toEqual([2]);
    expect(emitted).toEqual([1]);
  });

  it('clearAll resets the list', () => {
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: '1001' }));
    fixture.componentInstance.clearAll();
    expect(fixture.componentInstance.items()).toEqual([]);
  });

  it('item 3: con obra social (no particular) addAnalysis crea fila con isAuthorized=true', () => {
    // default isParticular = false ⇒ obra social
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: '1001' }));
    expect(fixture.componentInstance.items()[0].isAuthorized).toBe(true);
  });

  it('item 3: con cobertura Particular addAnalysis crea fila con isAuthorized=false', () => {
    const f = TestBed.createComponent(AnalysisPickerComponent);
    f.componentRef.setInput('isParticular', true);
    f.detectChanges();
    f.componentInstance.addAnalysis(a({ id: 1, shortCode: '1001' }));
    expect(f.componentInstance.items()[0].isAuthorized).toBe(false);
  });

  it('analysisAdded emite un PickerRow con isAuthorized=true en obra social', () => {
    const emitted: PickerRow[] = [];
    fixture.componentInstance.analysisAdded.subscribe((row) => emitted.push(row));
    fixture.componentInstance.addAnalysis(a({ id: 7, shortCode: '2001', name: 'Glucemia' }));
    expect(emitted).toHaveLength(1);
    expect(emitted[0].isAuthorized).toBe(true);
    expect(emitted[0].id).toBe(7);
  });

  it('item 2: con cobertura Particular NO se renderiza la columna "Autorizado"', () => {
    const f = TestBed.createComponent(AnalysisPickerComponent);
    f.componentRef.setInput('isParticular', true);
    f.detectChanges();
    const headers = Array.from((f.nativeElement as HTMLElement).querySelectorAll('th')).map((th) => th.textContent?.trim() ?? '');
    expect(headers.some((h) => h.includes('Autorizado'))).toBe(false);
  });

  it('item 2: con obra social SÍ se renderiza la columna "Autorizado"', () => {
    const headers = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th')).map((th) => th.textContent?.trim() ?? '');
    expect(headers.some((h) => h.includes('Autorizado'))).toBe(true);
  });

  it('hidrata initialItems preservando isAuthorized y emite itemsChanged (003)', () => {
    const f = TestBed.createComponent(AnalysisPickerComponent);
    const emitted: PickerRow[][] = [];
    f.componentInstance.itemsChanged.subscribe((rows) => emitted.push(rows));
    f.componentRef.setInput('initialItems', [
      { id: 3, shortCode: '1001', name: 'Hemograma', familyName: null, ubCount: null, isAuthorized: true },
      { id: 9, shortCode: '2001', name: 'Glucemia', familyName: null, ubCount: null, isAuthorized: false },
    ]);
    f.detectChanges();
    expect(f.componentInstance.items().map((r) => ({ id: r.id, auth: r.isAuthorized }))).toEqual([
      { id: 3, auth: true },
      { id: 9, auth: false },
    ]);
    // El padre recibe la lista sembrada para su dispatch (mismo contrato que onAuthorizedChange).
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toHaveLength(2);
  });

  it('itemsChanged emite la lista actualizada con isAuthorized correcto al llamar onAuthorizedChange', () => {
    const row = a({ id: 1, shortCode: '1001' });
    fixture.componentInstance.addAnalysis(row);
    const snapshots: PickerRow[][] = [];
    fixture.componentInstance.itemsChanged.subscribe((rows) => snapshots.push(rows));
    const pickerRow = fixture.componentInstance.items()[0];
    fixture.componentInstance.onAuthorizedChange(pickerRow, true);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toHaveLength(1);
    expect(snapshots[0][0].isAuthorized).toBe(true);
    // Verifica inmutabilidad: el objeto emitido es una copia nueva
    expect(snapshots[0][0]).not.toBe(pickerRow);
  });
});
