import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { BulkActionsBarComponent } from './bulk-actions-bar.component';
import type { TemporalLote } from '../../../models/transito.model';

describe('BulkActionsBarComponent', () => {
  let fixture: ComponentFixture<BulkActionsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkActionsBarComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(BulkActionsBarComponent);
  });

  function setInputs(selectedCount: number, lotes: TemporalLote[]) {
    fixture.componentRef.setInput('selectedCount', selectedCount);
    fixture.componentRef.setInput('lotes', lotes);
    fixture.detectChanges();
  }

  it('muestra estado reposo con 0 seleccionadas', () => {
    setInputs(0, []);
    expect(fixture.debugElement.query(By.css('.bulk.idle'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('button.create')).nativeElement.disabled).toBe(true);
  });

  it('muestra estado activo con >=1 seleccionada y chip por lote', () => {
    const lotes: TemporalLote[] = [
      { id: 'l1', sampleIds: ['s1', 's2'], branch: '', area: '', section: '', createdAt: 1 },
      { id: 'l2', sampleIds: ['s3'], branch: '', area: '', section: '', createdAt: 2 },
    ];
    setInputs(3, lotes);
    expect(fixture.debugElement.query(By.css('.bulk.active'))).toBeTruthy();
    const chips = fixture.debugElement.queryAll(By.css('button.chip-add'));
    expect(chips.length).toBe(2);
    expect(chips[0].nativeElement.textContent).toContain('Lote 1');
    expect(chips[1].nativeElement.textContent).toContain('Lote 2');
  });

  it('emite createLote, addToLote y clear', () => {
    const lotes: TemporalLote[] = [{ id: 'l1', sampleIds: [], branch: '', area: '', section: '', createdAt: 1 }];
    setInputs(2, lotes);
    const emits: string[] = [];
    fixture.componentInstance.createLote.subscribe(() => emits.push('create'));
    fixture.componentInstance.addToLote.subscribe(id => emits.push(`add:${id}`));
    fixture.componentInstance.clear.subscribe(() => emits.push('clear'));
    fixture.debugElement.query(By.css('button.create')).nativeElement.click();
    fixture.debugElement.query(By.css('button.chip-add')).nativeElement.click();
    fixture.debugElement.query(By.css('button.chip-clear')).nativeElement.click();
    expect(emits).toEqual(['create', 'add:l1', 'clear']);
  });
});
