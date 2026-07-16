import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalysisDetailModalComponent } from './analysis-detail-modal.component';
import { AnalysisService } from '../../services/analysis.service';
import { AnalysisDetail } from '../../models/atencion.model';

const detail: AnalysisDetail = {
  id: 5, shortCode: '1001', name: 'Hemograma', familyName: 'Hematología', ubCount: 3,
  description: 'Recuento celular', determinations: [{ id: 1, name: 'Globulos rojos' }],
  processingTime: 30, processingTimeUnit: 'MINUTES', nbuCode: 'NBU-123',
};

describe('AnalysisDetailModalComponent', () => {
  let fixture: ComponentFixture<AnalysisDetailModalComponent>;
  let api: { getById: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = { getById: vi.fn().mockReturnValue(of(detail)) };
    await TestBed.configureTestingModule({
      imports: [AnalysisDetailModalComponent],
      providers: [{ provide: AnalysisService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalysisDetailModalComponent);
  });

  it('does NOT fetch when visible is false', () => {
    fixture.componentRef.setInput('analysisId', 5);
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    expect(api.getById).not.toHaveBeenCalled();
  });

  it('fetches when visible turns true', () => {
    fixture.componentRef.setInput('analysisId', 5);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(api.getById).toHaveBeenCalledWith(5);
    expect(fixture.componentInstance.detail()?.nbuCode).toBe('NBU-123');
  });

  it('translates time unit MINUTES → minutos', () => {
    expect(fixture.componentInstance.translateUnit('MINUTES')).toBe('minutos');
    expect(fixture.componentInstance.translateUnit('HOURS')).toBe('horas');
    expect(fixture.componentInstance.translateUnit('DAYS')).toBe('días');
    expect(fixture.componentInstance.translateUnit('UNKNOWN')).toBe('UNKNOWN');
  });
});
