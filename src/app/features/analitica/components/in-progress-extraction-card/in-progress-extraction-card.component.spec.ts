import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { InExtractionItem } from '../../models/extraction.model';
import { InProgressExtractionCardComponent, initialsOf } from './in-progress-extraction-card.component';

function mineItem(over: Partial<InExtractionItem> = {}): InExtractionItem {
  return {
    id: 1, patientId: 1, patientFullName: 'Sosa, Mariana', patientDni: '35.220.118',
    patientBirthDate: null, patientGender: null,
    attentionNumber: 'A-FX0001', isUrgent: false, analysisCount: 4,
    insurancePlanLabel: null, createdAt: '', waitMinutes: 0,
    attentionBox: 3,
    extractionStartedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    extractorId: 50,
    extractorFullName: 'Extractor Prueba',
    samples: [],
    ...over,
  };
}

describe('initialsOf', () => {
  it('takes first letter of surname + first letter of first name for "Apellido, Nombre"', () => {
    expect(initialsOf('Sosa, Mariana')).toBe('SM');
  });

  it('takes first two name parts when no comma', () => {
    expect(initialsOf('Mariana Sosa')).toBe('MS');
  });

  it('single name returns just one letter', () => {
    expect(initialsOf('Maria')).toBe('M');
  });

  it('empty returns "?"', () => {
    expect(initialsOf('')).toBe('?');
  });

  it('handles extra whitespace', () => {
    expect(initialsOf('  Sosa,  Mariana  ')).toBe('SM');
  });
});

describe('InProgressExtractionCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations()],
    });
  });

  it('renders the empty state when patient is null', () => {
    const fixture = TestBed.createComponent(InProgressExtractionCardComponent);
    fixture.componentRef.setInput('patient', null);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin extracción en curso');
  });

  it('renders patient avatar, name, DNI, attention number and box', () => {
    const fixture = TestBed.createComponent(InProgressExtractionCardComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sosa, Mariana');
    expect(text).toContain('35.220.118');
    expect(text).toContain('A-FX0001');
    expect(text).toContain('Box 3');
    expect(fixture.nativeElement.querySelector('.avatar').textContent.trim()).toBe('SM');
  });

  it('shows URGENTE badge when isUrgent is true', () => {
    const fixture = TestBed.createComponent(InProgressExtractionCardComponent);
    fixture.componentRef.setInput('patient', mineItem({ isUrgent: true }));
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('URGENTE');
  });

  it('computes minutesElapsed from extractionStartedAt', () => {
    const fixture = TestBed.createComponent(InProgressExtractionCardComponent);
    fixture.componentRef.setInput('patient', mineItem({
      extractionStartedAt: new Date(Date.now() - 7 * 60_000).toISOString(),
    }));
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.componentInstance.minutesElapsed()).toBeGreaterThanOrEqual(6);
  });

  it('emits cancelClicked and endClicked from the action buttons', () => {
    const fixture = TestBed.createComponent(InProgressExtractionCardComponent);
    fixture.componentRef.setInput('patient', mineItem());
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();

    let cancelCount = 0;
    let endCount = 0;
    fixture.componentInstance.cancelClicked.subscribe(() => cancelCount++);
    fixture.componentInstance.endClicked.subscribe(() => endCount++);

    fixture.componentInstance.cancelClicked.emit();
    fixture.componentInstance.endClicked.emit();
    expect(cancelCount).toBe(1);
    expect(endCount).toBe(1);
  });
});
