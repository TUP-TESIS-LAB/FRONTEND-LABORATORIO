import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { LoteCardComponent } from './lote-card.component';
import type { Sample } from '../../../models/sample.model';
import type { TemporalLote } from '../../../models/transito.model';

const LOTE: TemporalLote = {
  id: 'l1', sampleIds: ['s-1'], branch: '', area: '', section: '', createdAt: 1,
};
const SAMPLE: Sample = {
  id: 's-1', barcode: 'MX-2606-00001', study: 'Hemograma completo',
  patient: 'García, M.', branch: 'NORTE — Belgrano',
  date: '07/06', time: '08:00', urgent: false, state: 'transito',
};

describe('LoteCardComponent', () => {
  let fixture: ComponentFixture<LoteCardComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoteCardComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(LoteCardComponent);
  });

  function setInputs() {
    fixture.componentRef.setInput('lote', LOTE);
    fixture.componentRef.setInput('number', 1);
    fixture.componentRef.setInput('samples', [SAMPLE]);
    fixture.componentRef.setInput('selectedIds', new Set<string>());
    fixture.componentRef.setInput('isActive', false);
    fixture.componentRef.setInput('leavingIds', new Set<string>());
    fixture.componentRef.setInput('flashId', null);
    fixture.detectChanges();
  }

  it('renderiza el título "Lote 1" y warning sin destino', () => {
    setInputs();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Lote 1');
    expect(text).toContain('Sin destino');
  });

  it('botón Enviar deshabilitado sin destino', () => {
    setInputs();
    const btn = fixture.debugElement.query(By.css('button.send'));
    expect(btn.nativeElement.disabled).toBe(true);
  });

  it('emite send() cuando hay destino y se clickea Enviar', () => {
    fixture.componentRef.setInput('lote', { ...LOTE, branch: 'CENTRAL — Sede Central', area: 'Hematología', section: 'Citometría' });
    fixture.componentRef.setInput('number', 1);
    fixture.componentRef.setInput('samples', [SAMPLE]);
    fixture.componentRef.setInput('selectedIds', new Set<string>());
    fixture.componentRef.setInput('isActive', false);
    fixture.componentRef.setInput('leavingIds', new Set<string>());
    fixture.componentRef.setInput('flashId', null);
    fixture.detectChanges();

    let sent = 0;
    fixture.componentInstance.send.subscribe(() => sent++);
    fixture.debugElement.query(By.css('button.send')).nativeElement.click();
    expect(sent).toBe(1);
  });
});
