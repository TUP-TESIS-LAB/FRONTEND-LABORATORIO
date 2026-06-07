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

  it('canConfirm is false when reason is shorter than 5 chars', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();

    fixture.componentInstance.onReasonChange('hi');
    expect(fixture.componentInstance.canConfirm()).toBe(false);
    expect(fixture.componentInstance.showError()).toBe(true);
  });

  it('canConfirm is true when reason has 5+ chars trimmed', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();

    fixture.componentInstance.onReasonChange('  paciente no vino  ');
    expect(fixture.componentInstance.trimmedLength()).toBe('paciente no vino'.length);
    expect(fixture.componentInstance.canConfirm()).toBe(true);
    expect(fixture.componentInstance.showError()).toBe(false);
  });

  it('emits cancelConfirmed with the trimmed reason', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();

    const emissions: { reason: string }[] = [];
    fixture.componentInstance.cancelConfirmed.subscribe((p) => emissions.push(p));

    fixture.componentInstance.onReasonChange('  paciente no se presentó  ');
    fixture.componentInstance.onConfirm();

    expect(emissions).toEqual([{ reason: 'paciente no se presentó' }]);
  });

  it('headerText uses the patient name', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.detectChanges();
    expect(fixture.componentInstance.headerText()).toBe('Cancelar extracción de Sosa, Mariana');
  });

  it('does not emit confirm when reason invalid', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.detectChanges();

    const emissions: { reason: string }[] = [];
    fixture.componentInstance.cancelConfirmed.subscribe((p) => emissions.push(p));
    fixture.componentInstance.onReasonChange('xx');
    fixture.componentInstance.onConfirm();
    expect(emissions).toEqual([]);
  });

  it('setQuickReason "No se presentó" sets reason to full text', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();

    fixture.componentInstance.setQuickReason('Paciente no se presentó al box');
    expect(fixture.componentInstance.reason()).toBe('Paciente no se presentó al box');
    expect(fixture.componentInstance.canConfirm()).toBe(true);
  });

  it('setQuickReason "Vía difícil" sets reason to full text', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();

    fixture.componentInstance.setQuickReason('No se pudo canalizar (vía difícil)');
    expect(fixture.componentInstance.reason()).toBe('No se pudo canalizar (vía difícil)');
    expect(fixture.componentInstance.canConfirm()).toBe(true);
  });

  it('setQuickReason "Descompensado" sets reason to full text', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();

    fixture.componentInstance.setQuickReason('Paciente descompensado');
    expect(fixture.componentInstance.reason()).toBe('Paciente descompensado');
    expect(fixture.componentInstance.canConfirm()).toBe(true);
  });

  it('confirm button stays disabled until reason has 5+ chars after quick reason', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();

    // Manually set a short reason (less than 5 chars)
    fixture.componentInstance.onReasonChange('hi');
    expect(fixture.componentInstance.canConfirm()).toBe(false);

    // Quick reason sets full text → confirm should be enabled
    fixture.componentInstance.setQuickReason('Paciente no se presentó al box');
    expect(fixture.componentInstance.canConfirm()).toBe(true);
  });

  it('emits cancelConfirmed with reason after selecting quick reason', () => {
    const fixture = TestBed.createComponent(CancelExtractionDialogComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();

    const emissions: { reason: string }[] = [];
    fixture.componentInstance.cancelConfirmed.subscribe((p) => emissions.push(p));

    fixture.componentInstance.setQuickReason('Paciente descompensado');
    fixture.componentInstance.onConfirm();

    expect(emissions).toEqual([{ reason: 'Paciente descompensado' }]);
  });
});
