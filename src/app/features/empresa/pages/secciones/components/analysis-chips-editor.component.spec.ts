import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AnalysisChipsEditorComponent } from './analysis-chips-editor.component';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import { Analysis } from '@features/analitica/models/atencion.model';
import { ResolvedAnalysis } from '@features/analitica/models/section-analysis.model';

function analysis(id: number, shortCode: string, name: string): Analysis {
  return { id, shortCode, name, familyName: null, ubCount: null, determinations: [] } as unknown as Analysis;
}

describe('AnalysisChipsEditorComponent', () => {
  function setup(api: Partial<AnalysisService> = {}) {
    TestBed.configureTestingModule({
      imports: [AnalysisChipsEditorComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AnalysisService, useValue: api },
      ],
    });
    const fixture = TestBed.createComponent(AnalysisChipsEditorComponent);
    fixture.detectChanges();
    return { fixture, cmp: fixture.componentInstance };
  }

  it('onSelect agrega un chip found y expone su id', () => {
    const { cmp } = setup();
    cmp.onSelect({ value: analysis(10, '0100', 'Glucosa') } as any);
    expect(cmp.value()).toEqual([{ analysisId: 10, name: 'Glucosa', state: 'found' }]);
    expect(cmp.analysisIds()).toEqual([10]);
  });

  it('no duplica un análisis ya agregado', () => {
    const { cmp } = setup();
    cmp.onSelect({ value: analysis(10, '0100', 'Glucosa') } as any);
    cmp.onSelect({ value: analysis(10, '0100', 'Glucosa') } as any);
    expect(cmp.value().length).toBe(1);
  });

  it('pegar una lista con separadores resuelve en batch (found + notfound)', () => {
    const resolved: ResolvedAnalysis[] = [
      { name: 'Glucosa', analysisId: 10, matched: true },
      { name: 'Inexistente', analysisId: null, matched: false },
    ];
    const resolveByNames = vi.fn().mockReturnValue(of(resolved));
    const { cmp } = setup({ resolveByNames } as any);

    const paste = {
      clipboardData: { getData: () => 'Glucosa, Inexistente' },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;
    cmp.onPaste(paste);

    expect(paste.preventDefault).toHaveBeenCalled();
    expect(resolveByNames).toHaveBeenCalledWith(['Glucosa', 'Inexistente']);
    expect(cmp.value()).toEqual([
      { analysisId: 10, name: 'Glucosa', state: 'found' },
      { analysisId: null, name: 'Inexistente', state: 'notfound' },
    ]);
    // Sólo el found aporta id para guardar.
    expect(cmp.analysisIds()).toEqual([10]);
  });

  it('pegar un solo token sin separadores no intercepta (deja el autocomplete)', () => {
    const resolveByNames = vi.fn();
    const { cmp } = setup({ resolveByNames } as any);
    const paste = {
      clipboardData: { getData: () => 'Glucosa' },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;
    cmp.onPaste(paste);
    expect(paste.preventDefault).not.toHaveBeenCalled();
    expect(resolveByNames).not.toHaveBeenCalled();
  });

  it('remove saca el chip por índice', () => {
    const { cmp } = setup();
    cmp.value.set([
      { analysisId: 1, name: 'A', state: 'found' },
      { analysisId: 2, name: 'B', state: 'found' },
    ]);
    cmp.remove(0);
    expect(cmp.value()).toEqual([{ analysisId: 2, name: 'B', state: 'found' }]);
  });
});
