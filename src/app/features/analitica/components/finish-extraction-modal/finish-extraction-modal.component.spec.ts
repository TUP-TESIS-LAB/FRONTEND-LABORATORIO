import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { InExtractionItem } from '../../models/extraction.model';
import { FinishExtractionModalComponent } from './finish-extraction-modal.component';

function mineItem(over: Partial<InExtractionItem> = {}): InExtractionItem {
  return {
    id: 1, patientId: 1, patientFullName: 'Sosa, Mariana', patientDni: '35220118',
    patientBirthDate: null, patientGender: null,
    attentionNumber: 'A-1', publicCode: 'CT-007', isUrgent: false, analysisCount: 3,
    insurancePlanLabel: null, createdAt: '', waitMinutes: 0,
    attentionBox: 4, extractionStartedAt: '', extractorId: 50, extractorFullName: 'Extractor',
    samples: [],
    ...over,
  };
}

describe('FinishExtractionModalComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations()],
    });
  });

  it('headerText uses the patient name', () => {
    const fixture = TestBed.createComponent(FinishExtractionModalComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.detectChanges();
    expect(fixture.componentInstance.headerText()).toBe('Finalizar extracción de Sosa, Mariana');
  });

  it('headerText falls back when no patient', () => {
    const fixture = TestBed.createComponent(FinishExtractionModalComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.headerText()).toBe('Finalizar extracción');
  });

  it('analysisLabel uses analysisCount when there are no samples', () => {
    const fixture = TestBed.createComponent(FinishExtractionModalComponent);
    fixture.componentRef.setInput('patient', mineItem({ analysisCount: 3, samples: [] }));
    fixture.detectChanges();
    expect(fixture.componentInstance.analysisLabel()).toBe('3 análisis');
  });

  it('analysisLabel sums sample counts when present', () => {
    const fixture = TestBed.createComponent(FinishExtractionModalComponent);
    fixture.componentRef.setInput('patient', mineItem({
      analysisCount: 3,
      samples: [
        { sampleType: 'SUERO', count: 2 },
        { sampleType: 'ORINA', count: 1 },
      ],
    }));
    fixture.detectChanges();
    expect(fixture.componentInstance.analysisLabel()).toBe('3 análisis');
  });

  it('analysisLabel singularizes for one analysis', () => {
    const fixture = TestBed.createComponent(FinishExtractionModalComponent);
    fixture.componentRef.setInput('patient', mineItem({ analysisCount: 1, samples: [] }));
    fixture.detectChanges();
    expect(fixture.componentInstance.analysisLabel()).toBe('1 análisis');
  });

  it('confirmed emits the trimmed observation', () => {
    const fixture = TestBed.createComponent(FinishExtractionModalComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.detectChanges();

    const emissions: string[] = [];
    fixture.componentInstance.confirmed.subscribe((o) => emissions.push(o));

    fixture.componentInstance.onObservationChange('  muestra hemolizada  ');
    fixture.componentInstance.onConfirm();

    expect(emissions).toEqual(['muestra hemolizada']);
  });

  it('confirmed emits empty string when no observation typed', () => {
    const fixture = TestBed.createComponent(FinishExtractionModalComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.detectChanges();

    const emissions: string[] = [];
    fixture.componentInstance.confirmed.subscribe((o) => emissions.push(o));

    fixture.componentInstance.onConfirm();

    expect(emissions).toEqual(['']);
  });

  it('onCancel closes the dialog and emits dismissed', () => {
    const fixture = TestBed.createComponent(FinishExtractionModalComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.detectChanges();

    let dismissed = 0;
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
    fixture.componentInstance.visible.set(true);

    fixture.componentInstance.onCancel();

    expect(fixture.componentInstance.visible()).toBe(false);
    expect(dismissed).toBe(1);
  });

  it('onHide resets the observation', () => {
    const fixture = TestBed.createComponent(FinishExtractionModalComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.detectChanges();

    fixture.componentInstance.onObservationChange('algo');
    fixture.componentInstance.onHide();

    expect(fixture.componentInstance.observation()).toBe('');
  });
});
