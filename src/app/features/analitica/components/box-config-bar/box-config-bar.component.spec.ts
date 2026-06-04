import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BoxAssignment, BranchExtractor } from '../../models/extraction.model';
import { BoxConfigBarComponent } from './box-config-bar.component';

function assignment(over: Partial<BoxAssignment> = {}): BoxAssignment {
  return { boxNumber: 1, extractorId: null, extractorFullName: null, ...over };
}

function extractor(over: Partial<BranchExtractor> = {}): BranchExtractor {
  return { id: 1, fullName: 'González, Laura', ...over };
}

describe('BoxConfigBarComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations()],
    });
  });

  // -------------------------------------------------------------------------
  // Render — lista de boxes
  // -------------------------------------------------------------------------

  it('renders one box row per assignment', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 1 }),
      assignment({ boxNumber: 2 }),
      assignment({ boxNumber: 3 }),
    ]);
    fixture.componentRef.setInput('extractors', []);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.box-config-bar__item');
    expect(items.length).toBe(3);
  });

  it('shows "Box N" label for each assignment', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 4 }),
      assignment({ boxNumber: 7 }),
    ]);
    fixture.componentRef.setInput('extractors', []);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Box 4');
    expect(text).toContain('Box 7');
  });

  it('shows extractor full name when one is assigned', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 1, extractorId: 10, extractorFullName: 'Romero, Pablo' }),
    ]);
    fixture.componentRef.setInput('extractors', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Romero, Pablo');
  });

  it('shows "Sin asignar" when no extractor is assigned to a box', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 1, extractorId: null, extractorFullName: null }),
    ]);
    fixture.componentRef.setInput('extractors', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin asignar');
  });

  it('shows empty state when assignments list is empty', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', []);
    fixture.componentRef.setInput('extractors', []);
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.box-config-bar__empty');
    expect(empty).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // Botón Agregar box
  // -------------------------------------------------------------------------

  it('renders the "Agregar box" button', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', []);
    fixture.componentRef.setInput('extractors', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Agregar box');
  });

  it('emits addBox when clicking "Agregar box"', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', []);
    fixture.componentRef.setInput('extractors', []);
    fixture.detectChanges();

    let count = 0;
    fixture.componentInstance.addBox.subscribe(() => count++);
    fixture.componentInstance.onAddBox();

    expect(count).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Menu items — assign output
  // -------------------------------------------------------------------------

  it('menuItemsFor builds one item per extractor plus unassign separator entry', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 2, extractorId: null }),
    ]);
    fixture.componentRef.setInput('extractors', [
      extractor({ id: 1, fullName: 'González, Laura' }),
      extractor({ id: 2, fullName: 'Martínez, Luis' }),
    ]);
    fixture.detectChanges();

    const items = fixture.componentInstance.menuItemsFor(0);
    // 2 extractores + 1 separator + 1 "Sin asignar" = 4
    expect(items.length).toBe(4);
    expect(items[0].label).toBe('González, Laura');
    expect(items[1].label).toBe('Martínez, Luis');
    expect(items[2].separator).toBe(true);
    expect(items[3].label).toBe('Sin asignar');
  });

  it('emits assign with { boxNumber, extractorId } when extractor menu item is triggered', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 3, extractorId: null }),
    ]);
    fixture.componentRef.setInput('extractors', [
      extractor({ id: 5, fullName: 'Perez, Ana' }),
    ]);
    fixture.detectChanges();

    const emissions: { boxNumber: number; extractorId: number | null }[] = [];
    fixture.componentInstance.assign.subscribe((v) => emissions.push(v));

    const items = fixture.componentInstance.menuItemsFor(0);
    // First item is the extractor
    items[0].command!({} as never);

    expect(emissions).toEqual([{ boxNumber: 3, extractorId: 5 }]);
  });

  it('emits assign with extractorId=null when "Sin asignar" item is triggered', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 1, extractorId: 10, extractorFullName: 'Romero, Pablo' }),
    ]);
    fixture.componentRef.setInput('extractors', [
      extractor({ id: 10, fullName: 'Romero, Pablo' }),
    ]);
    fixture.detectChanges();

    const emissions: { boxNumber: number; extractorId: number | null }[] = [];
    fixture.componentInstance.assign.subscribe((v) => emissions.push(v));

    const items = fixture.componentInstance.menuItemsFor(0);
    // Last item is "Sin asignar"
    items[items.length - 1].command!({} as never);

    expect(emissions).toEqual([{ boxNumber: 1, extractorId: null }]);
  });

  it('emits correct boxNumber when multiple boxes are present', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 10, extractorId: null }),
      assignment({ boxNumber: 20, extractorId: null }),
    ]);
    fixture.componentRef.setInput('extractors', [
      extractor({ id: 7, fullName: 'Lopez, Elena' }),
    ]);
    fixture.detectChanges();

    const emissions: { boxNumber: number; extractorId: number | null }[] = [];
    fixture.componentInstance.assign.subscribe((v) => emissions.push(v));

    // Trigger from index 1 (box 20)
    const items = fixture.componentInstance.menuItemsFor(1);
    items[0].command!({} as never);

    expect(emissions).toEqual([{ boxNumber: 20, extractorId: 7 }]);
  });

  it('returns empty items for an out-of-range index', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [assignment({ boxNumber: 1 })]);
    fixture.componentRef.setInput('extractors', []);
    fixture.detectChanges();

    const items = fixture.componentInstance.menuItemsFor(99);
    expect(items).toEqual([]);
  });
});
