import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalysisPickerComponent } from './analysis-picker.component';
import { AnalysisService } from '../../services/analysis.service';
import { Analysis } from '../../models/atencion.model';

const a = (over: Partial<Analysis>): Analysis => ({
  id: 1, shortCode: 1001, name: 'Hemograma', familyName: 'Hematología', ubCount: 3, ...over,
});

describe('AnalysisPickerComponent', () => {
  let fixture: ComponentFixture<AnalysisPickerComponent>;
  let api: { findByShortCode: ReturnType<typeof vi.fn>; searchByName: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = { findByShortCode: vi.fn(), searchByName: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AnalysisPickerComponent],
      providers: [{ provide: AnalysisService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalysisPickerComponent);
    fixture.detectChanges();
  });

  it('detects numeric input as shortCode and uses findByShortCode', () => {
    api.findByShortCode.mockReturnValue(of(a({ id: 5, shortCode: 1001 })));
    fixture.componentInstance.handleEnter('1001');
    expect(api.findByShortCode).toHaveBeenCalledWith(1001);
    expect(fixture.componentInstance.items()).toHaveLength(1);
  });

  it('detects text input as name and uses searchByName for suggestions', () => {
    api.searchByName.mockReturnValue(of([a({ id: 5 }), a({ id: 6, shortCode: 1002, name: 'Glucemia' })]));
    fixture.componentInstance.onAutoCompleteSearch({ query: 'gluc' } as any);
    expect(api.searchByName).toHaveBeenCalledWith('gluc');
    expect(fixture.componentInstance.suggestions().length).toBe(2);
  });

  it('addAnalysis blocks duplicates by shortCode', () => {
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: 1001 }));
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: 1001 }));
    expect(fixture.componentInstance.items().length).toBe(1);
    expect(fixture.componentInstance.errorText()).toContain('ya está');
  });

  it('removeAnalysis filters by id and emits analysisRemoved', () => {
    const emitted: number[] = [];
    fixture.componentInstance.analysisRemoved.subscribe((id) => emitted.push(id));
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: 1001 }));
    fixture.componentInstance.addAnalysis(a({ id: 2, shortCode: 1002, name: 'Glucemia' }));
    fixture.componentInstance.removeAnalysis(1);
    expect(fixture.componentInstance.items().map((x) => x.id)).toEqual([2]);
    expect(emitted).toEqual([1]);
  });

  it('clearAll resets the list', () => {
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: 1001 }));
    fixture.componentInstance.clearAll();
    expect(fixture.componentInstance.items()).toEqual([]);
  });
});
