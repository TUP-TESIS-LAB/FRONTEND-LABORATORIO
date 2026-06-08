import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { InExtractionItem } from '../../models/extraction.model';
import { CancelExtractionDialogComponent } from './cancel-extraction-dialog.component';

function mineItem(): InExtractionItem {
  return {
    id: 1, patientId: 1, patientFullName: 'Sosa, Mariana', patientDni: '35220118',
    patientBirthDate: null, patientGender: null,
    attentionNumber: 'A-1', publicCode: null, isUrgent: false, analysisCount: 2,
    insurancePlanLabel: null, createdAt: '', waitMinutes: 0,
    attentionBox: 3, extractionStartedAt: '', extractorId: 50, extractorFullName: 'Extractor', samples: [],
  };
}

describe('CancelExtractionDialogComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations()],
    });
  });

  it('headerText uses the patient name', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.detectChanges();
    expect(fixture.componentInstance.headerText()).toBe('Cancelar extracción de Sosa, Mariana');
  });

  it('headerText shows generic label when patient is null', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', null);
    fixture.detectChanges();
    expect(fixture.componentInstance.headerText()).toBe('Cancelar extracción');
  });

  it('emits cancelConfirmed with reason OTRO on confirm', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();

    const emissions: { reason: string }[] = [];
    fixture.componentInstance.cancelConfirmed.subscribe((p) => emissions.push(p));

    fixture.componentInstance.onConfirm();

    expect(emissions).toEqual([{ reason: 'OTRO' }]);
  });
});
