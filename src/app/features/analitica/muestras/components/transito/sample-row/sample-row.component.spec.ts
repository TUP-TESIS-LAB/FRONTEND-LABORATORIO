import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { SampleRowComponent } from './sample-row.component';
import type { Sample } from '../../../models/sample.model';

const SAMPLE: Sample = {
  id: 's-1', barcode: 'MX-2606-00001', study: 'Hemograma completo',
  patient: 'García, M.', branch: 'CENTRAL — Sede Central',
  date: '07/06', time: '08:42', urgent: false, state: 'transito',
};

describe('SampleRowComponent', () => {
  let fixture: ComponentFixture<SampleRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SampleRowComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(SampleRowComponent);
  });

  it('renderiza barcode, paciente, estudio y origen', () => {
    fixture.componentRef.setInput('sample', SAMPLE);
    fixture.componentRef.setInput('selected', false);
    fixture.componentRef.setInput('flashing', false);
    fixture.componentRef.setInput('leaving', false);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('MX-2606-00001');
    expect(text).toContain('García, M.');
    expect(text).toContain('Hemograma completo');
    expect(text).toContain('CENTRAL');
  });

  it('aplica clase is-selected cuando selected=true', () => {
    fixture.componentRef.setInput('sample', SAMPLE);
    fixture.componentRef.setInput('selected', true);
    fixture.componentRef.setInput('flashing', false);
    fixture.componentRef.setInput('leaving', false);
    fixture.detectChanges();
    const row = fixture.debugElement.query(By.css('.row'));
    expect(row.nativeElement.classList.contains('is-selected')).toBe(true);
  });

  it('muestra tag URGENTE si sample.urgent', () => {
    fixture.componentRef.setInput('sample', { ...SAMPLE, urgent: true });
    fixture.componentRef.setInput('selected', false);
    fixture.componentRef.setInput('flashing', false);
    fixture.componentRef.setInput('leaving', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('URGENTE');
  });

  it('emite toggle() al click', () => {
    fixture.componentRef.setInput('sample', SAMPLE);
    fixture.componentRef.setInput('selected', false);
    fixture.componentRef.setInput('flashing', false);
    fixture.componentRef.setInput('leaving', false);
    let count = 0;
    fixture.componentInstance.toggle.subscribe(() => count++);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('.row')).nativeElement.click();
    expect(count).toBe(1);
  });
});
