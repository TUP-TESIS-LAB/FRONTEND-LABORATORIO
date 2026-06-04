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
  // Sin botón "Agregar box" (boxes definidos por backend)
  // -------------------------------------------------------------------------

  it('does NOT render an "Agregar box" button', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', []);
    fixture.componentRef.setInput('extractors', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Agregar box');
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

  // -------------------------------------------------------------------------
  // Menu items — exclusión de extractores ya asignados a otro box (Fix 2)
  // -------------------------------------------------------------------------

  it('extractor assigned to box 1 does NOT appear in the dropdown of box 2', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 1, extractorId: 10, extractorFullName: 'Romero, Pablo' }),
      assignment({ boxNumber: 2, extractorId: null, extractorFullName: null }),
    ]);
    fixture.componentRef.setInput('extractors', [
      extractor({ id: 10, fullName: 'Romero, Pablo' }),
      extractor({ id: 20, fullName: 'García, Marta' }),
    ]);
    fixture.detectChanges();

    const items = fixture.componentInstance.menuItemsFor(1); // box 2
    const labels = items.filter((i) => !i.separator).map((i) => i.label);
    expect(labels).not.toContain('Romero, Pablo');
    expect(labels).toContain('García, Marta');
    expect(labels).toContain('Sin asignar');
  });

  it('extractor currently assigned to a box IS included in its own dropdown (shown as selected)', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 1, extractorId: 10, extractorFullName: 'Romero, Pablo' }),
      assignment({ boxNumber: 2, extractorId: 20, extractorFullName: 'García, Marta' }),
    ]);
    fixture.componentRef.setInput('extractors', [
      extractor({ id: 10, fullName: 'Romero, Pablo' }),
      extractor({ id: 20, fullName: 'García, Marta' }),
    ]);
    fixture.detectChanges();

    const items = fixture.componentInstance.menuItemsFor(0); // box 1
    const extItems = items.filter((i) => !i.separator && i.label !== 'Sin asignar');
    expect(extItems.map((i) => i.label)).toContain('Romero, Pablo');
    // el extractor del box 1 aparece con check (está seleccionado)
    const romeroItem = extItems.find((i) => i.label === 'Romero, Pablo');
    expect(romeroItem?.icon).toBe('pi pi-check');
  });

  it('"Sin asignar" always appears in every box dropdown', () => {
    const fixture = TestBed.createComponent(BoxConfigBarComponent);
    fixture.componentRef.setInput('assignments', [
      assignment({ boxNumber: 1, extractorId: 10, extractorFullName: 'Romero, Pablo' }),
      assignment({ boxNumber: 2, extractorId: null, extractorFullName: null }),
    ]);
    fixture.componentRef.setInput('extractors', [
      extractor({ id: 10, fullName: 'Romero, Pablo' }),
    ]);
    fixture.detectChanges();

    const itemsBox1 = fixture.componentInstance.menuItemsFor(0);
    const itemsBox2 = fixture.componentInstance.menuItemsFor(1);
    expect(itemsBox1.some((i) => i.label === 'Sin asignar')).toBe(true);
    expect(itemsBox2.some((i) => i.label === 'Sin asignar')).toBe(true);
  });
});
