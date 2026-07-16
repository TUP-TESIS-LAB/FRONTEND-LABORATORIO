import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { InExtractionItem } from '../../models/extraction.model';
import {
  FinishExtractionModalComponent,
  containerRows,
  pluralize,
  totalContainers,
} from './finish-extraction-modal.component';

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

describe('resumen de recipientes (lógica pura)', () => {
  // Caso realista: 4 análisis de sangre que comparten 1 tubo + 1 de orina en 1 frasco.
  // `count` cuenta análisis (4 y 1); `tubeCount` cuenta recipientes (1 y 1).
  const samples = [
    { sampleType: 'BLOOD', count: 4, tubeCount: 1 },
    { sampleType: 'URINE', count: 1, tubeCount: 1 },
  ];

  it('totalContainers suma tubeCount, no count', () => {
    expect(totalContainers(samples)).toBe(2);
  });

  it('totalContainers refleja los tubos configurados por el laboratorio', () => {
    expect(totalContainers([{ sampleType: 'BLOOD', count: 4, tubeCount: 3 }])).toBe(3);
  });

  it('totalContainers es 0 sin muestras', () => {
    expect(totalContainers([])).toBe(0);
    expect(totalContainers(null)).toBe(0);
    expect(totalContainers(undefined)).toBe(0);
  });

  it('containerRows descarta los tipos que no aportan recipientes', () => {
    const rows = containerRows([...samples, { sampleType: 'SALIVA', count: 2, tubeCount: 0 }]);
    expect(rows.map((r) => r.sampleType)).toEqual(['BLOOD', 'URINE']);
  });

  it('pluralize singulariza en 1 y pluraliza en el resto', () => {
    expect(pluralize(1, 'recipiente', 'recipientes')).toBe('1 recipiente');
    expect(pluralize(2, 'recipiente', 'recipientes')).toBe('2 recipientes');
    expect(pluralize(0, 'recipiente', 'recipientes')).toBe('0 recipientes');
  });
});

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
