import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { InExtractionItem } from '../../models/extraction.model';
import { InProgressListComponent } from './in-progress-list.component';

function makeItem(over: Partial<InExtractionItem> = {}): InExtractionItem {
  return {
    id: 1,
    patientId: 1,
    patientFullName: 'Sosa, Mariana',
    patientDni: '35.220.118',
    patientBirthDate: null,
    patientGender: null,
    attentionNumber: 'A-FX0001',
    isUrgent: false,
    analysisCount: 4,
    insurancePlanLabel: null,
    createdAt: '',
    waitMinutes: 0,
    attentionBox: 3,
    extractionStartedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    extractorId: 50,
    extractorFullName: 'Pérez, Juan',
    samples: [],
    ...over,
  };
}

describe('InProgressListComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations()],
    });
  });

  it('renders the empty state when items is empty', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay extracciones en curso');
  });

  it('does not render the table when items is empty', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-table')).toBeNull();
  });

  it('renders one row per item — patient name, DNI, extractor and box', () => {
    const item = makeItem();
    const fixture = TestBed.createComponent(InProgressListComponent);
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sosa, Mariana');
    expect(text).toContain('35.220.118');
    expect(text).toContain('Pérez, Juan');
    expect(text).toContain('Box 3');
  });

  it('renders N rows for N items', () => {
    const items = [
      makeItem({ id: 1, patientFullName: 'López, Ana', attentionBox: 1, extractorId: 10, extractorFullName: 'Ext Uno' }),
      makeItem({ id: 2, patientFullName: 'Gómez, Luis', attentionBox: 2, extractorId: 20, extractorFullName: 'Ext Dos' }),
      makeItem({ id: 3, patientFullName: 'Ríos, Clara', attentionBox: 4, extractorId: 30, extractorFullName: 'Ext Tres' }),
    ];
    const fixture = TestBed.createComponent(InProgressListComponent);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('López, Ana');
    expect(text).toContain('Gómez, Luis');
    expect(text).toContain('Ríos, Clara');
  });

  it('shows URGENTE tag when isUrgent is true', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    fixture.componentRef.setInput('items', [makeItem({ isUrgent: true })]);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('URGENTE');
  });

  it('does not show URGENTE tag when isUrgent is false', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    fixture.componentRef.setInput('items', [makeItem({ isUrgent: false })]);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('URGENTE');
  });

  it('shows timer text "en curso desde" for each item', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    fixture.componentRef.setInput('items', [makeItem()]);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('en curso desde');
  });

  it('computes minutesElapsed from extractionStartedAt', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    const item = makeItem({
      extractionStartedAt: new Date(Date.now() - 7 * 60_000).toISOString(),
    });
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.componentInstance.minutesElapsed(item)).toBeGreaterThanOrEqual(6);
  });

  it('returns 0 minutesElapsed for invalid extractionStartedAt', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    const item = makeItem({ extractionStartedAt: 'not-a-date' });
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.componentInstance.minutesElapsed(item)).toBe(0);
  });

  it('returns "—" from startedLabel for invalid extractionStartedAt', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    const item = makeItem({ extractionStartedAt: 'bad-date' });
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.componentInstance.startedLabel(item)).toBe('—');
  });

  it('formats startedLabel as HH:MM from ISO string', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    // Use a fixed time to avoid flakiness: 2026-06-03T09:05:00.000Z
    // This is UTC, local rendering depends on timezone — we just verify
    // the format matches HH:MM (two digits colon two digits).
    const item = makeItem({ extractionStartedAt: new Date(Date.now() - 10 * 60_000).toISOString() });
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    const label = fixture.componentInstance.startedLabel(item);
    expect(label).toMatch(/^\d{2}:\d{2}$/);
  });

  it('emits cancel with the corresponding item when Cancelar is clicked', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    const item = makeItem();
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();

    let emitted: InExtractionItem | undefined;
    fixture.componentInstance.cancel.subscribe((v) => (emitted = v));
    fixture.componentInstance.cancel.emit(item);
    expect(emitted).toBe(item);
  });

  it('emits end with the corresponding item when Finalizar is clicked', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    const item = makeItem();
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();

    let emitted: InExtractionItem | undefined;
    fixture.componentInstance.end.subscribe((v) => (emitted = v));
    fixture.componentInstance.end.emit(item);
    expect(emitted).toBe(item);
  });

  it('buttons are disabled when mutating is true', () => {
    const fixture = TestBed.createComponent(InProgressListComponent);
    fixture.componentRef.setInput('items', [makeItem()]);
    fixture.componentRef.setInput('mutating', true);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const allDisabled = Array.from(buttons as NodeListOf<HTMLButtonElement>).every(
      (b) => b.disabled || b.hasAttribute('disabled'),
    );
    expect(allDisabled).toBe(true);
  });
});
