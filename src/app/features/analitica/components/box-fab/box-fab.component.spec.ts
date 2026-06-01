import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BoxOccupancyItem } from '../../models/extraction.model';
import { BoxFabComponent } from './box-fab.component';

function occ(over: Partial<BoxOccupancyItem> = {}): BoxOccupancyItem {
  return {
    box: 1, extractorId: 100, extractorFullName: 'Otro',
    attentionId: 11, attentionNumber: 'A-1', ...over,
  };
}

describe('BoxFabComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations()],
    });
  });

  it('renders "Configurar box" when no myBox', () => {
    const fixture = TestBed.createComponent(BoxFabComponent);
    fixture.componentRef.setInput('occupancy', []);
    fixture.componentRef.setInput('myBox', null);
    fixture.componentRef.setInput('myUserId', 50);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Configurar box');
  });

  it('renders "Box N · TÚ" when myBox is set', () => {
    const fixture = TestBed.createComponent(BoxFabComponent);
    fixture.componentRef.setInput('occupancy', []);
    fixture.componentRef.setInput('myBox', 3);
    fixture.componentRef.setInput('myUserId', 50);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Box 3');
    expect(text).toContain('TÚ');
  });

  it('rows() builds list with my box first and busy others', () => {
    const fixture = TestBed.createComponent(BoxFabComponent);
    fixture.componentRef.setInput('occupancy', [
      occ({ box: 1, extractorId: 100, extractorFullName: 'Juan' }),
      occ({ box: 5, extractorId: 200, extractorFullName: 'María' }),
    ]);
    fixture.componentRef.setInput('myBox', 3);
    fixture.componentRef.setInput('myUserId', 50);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();

    const rows = fixture.componentInstance.rows();
    expect(rows[0].box).toBe(3);
    expect(rows[0].state).toBe('YOU');
    expect(rows[1].box).toBe(1);
    expect(rows[1].state).toBe('BUSY');
    expect(rows[1].occupiedByOther).toBe(true);
    expect(rows[2].box).toBe(5);
  });

  it('shows error in editError when chosen box is occupied by another extractor', () => {
    const fixture = TestBed.createComponent(BoxFabComponent);
    fixture.componentRef.setInput('occupancy', [occ({ box: 5, extractorId: 200 })]);
    fixture.componentRef.setInput('myBox', null);
    fixture.componentRef.setInput('myUserId', 50);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();

    fixture.componentInstance.draftBox.set(5);
    expect(fixture.componentInstance.editError()).toContain('ocupado');
  });

  it('does not flag editError when the chosen box is mine', () => {
    const fixture = TestBed.createComponent(BoxFabComponent);
    fixture.componentRef.setInput('occupancy', [occ({ box: 5, extractorId: 50 })]);
    fixture.componentRef.setInput('myBox', 5);
    fixture.componentRef.setInput('myUserId', 50);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();

    fixture.componentInstance.draftBox.set(5);
    expect(fixture.componentInstance.editError()).toBeNull();
  });

  it('emits boxSelected when picking a free row', () => {
    const fixture = TestBed.createComponent(BoxFabComponent);
    fixture.componentRef.setInput('occupancy', []);
    fixture.componentRef.setInput('myBox', 3);
    fixture.componentRef.setInput('myUserId', 50);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();

    const emissions: number[] = [];
    fixture.componentInstance.boxSelected.subscribe((n) => emissions.push(n));
    fixture.componentInstance.onPickRow({
      box: 4, who: null, attentionNumber: null, state: 'FREE', occupiedByOther: false,
    });
    expect(emissions).toEqual([4]);
  });

  it('does NOT emit boxSelected when picking an occupied row', () => {
    const fixture = TestBed.createComponent(BoxFabComponent);
    fixture.componentRef.setInput('occupancy', [occ({ box: 4, extractorId: 200 })]);
    fixture.componentRef.setInput('myBox', null);
    fixture.componentRef.setInput('myUserId', 50);
    fixture.componentRef.setInput('mutating', false);
    fixture.detectChanges();

    const emissions: number[] = [];
    fixture.componentInstance.boxSelected.subscribe((n) => emissions.push(n));
    fixture.componentInstance.onPickRow({
      box: 4, who: 'Otra', attentionNumber: null, state: 'BUSY', occupiedByOther: true,
    });
    expect(emissions).toEqual([]);
  });
});
