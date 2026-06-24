import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { LoteCardComponent } from './lote-card.component';
import type { Sample } from '../../../models/sample.model';
import type { LoteDestPatch, SectionOption, TemporalLote } from '../../../models/transito.model';

const LOTE: TemporalLote = {
  id: 'l1', sampleIds: ['s-1'], branch: '', area: '', section: '', createdAt: 1,
};
const SAMPLE: Sample = {
  id: 's-1', barcode: 'MX-2606-00001', study: 'Hemograma completo',
  patient: 'García, M.', branch: 'NORTE — Belgrano',
  receivedAt: '2026-06-07T08:00:00Z', urgent: false, state: 'transito',
};
const BRANCH_OPTIONS = [
  { id: 1001, name: 'CENTRAL — Sede Central' },
  { id: 1002, name: 'NORTE — Belgrano' },
];
const SECTION_OPTIONS: SectionOption[] = [
  { sectionId: 10, sectionName: 'Citometría', areaName: 'Hematología', label: 'Hematología · Citometría' },
  {
    sectionId: 30, sectionName: 'Microbiología', areaName: 'Bacteriología',
    label: 'Bacteriología · Microbiología (→ NORTE)', branchName: 'NORTE', isOtherBranch: true,
  },
];

describe('LoteCardComponent', () => {
  let fixture: ComponentFixture<LoteCardComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoteCardComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(LoteCardComponent);
  });

  function setInputs(lote: TemporalLote = LOTE) {
    fixture.componentRef.setInput('lote', lote);
    fixture.componentRef.setInput('number', 1);
    fixture.componentRef.setInput('samples', [SAMPLE]);
    fixture.componentRef.setInput('selectedIds', new Set<string>());
    fixture.componentRef.setInput('isActive', false);
    fixture.componentRef.setInput('leavingIds', new Set<string>());
    fixture.componentRef.setInput('flashId', null);
    fixture.componentRef.setInput('branchOptions', BRANCH_OPTIONS);
    fixture.componentRef.setInput('sectionOptions', SECTION_OPTIONS);
    fixture.componentRef.setInput('currentBranchName', 'CENTRAL — Sede Central');
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

  it('emite send() cuando hay destino local (sucursal actual + sectionId)', () => {
    setInputs({
      ...LOTE, branch: 'CENTRAL — Sede Central', sectionId: 10,
      area: 'Hematología', section: 'Citometría',
    });
    let sent = 0;
    fixture.componentInstance.send.subscribe(() => sent++);
    fixture.debugElement.query(By.css('button.send')).nativeElement.click();
    expect(sent).toBe(1);
  });

  it('destino local: muestra selector de sección y emite destChange con ids + nombres', () => {
    setInputs({ ...LOTE, branch: 'CENTRAL — Sede Central' });
    const select = fixture.debugElement.query(By.css('select[aria-label="Sección de destino"]'));
    expect(select).not.toBeNull();

    const patches: LoteDestPatch[] = [];
    fixture.componentInstance.destChange.subscribe(p => patches.push(p));
    select.nativeElement.value = '10';
    select.nativeElement.dispatchEvent(new Event('change'));
    expect(patches).toEqual([{ sectionId: 10, area: 'Hematología', section: 'Citometría' }]);
  });

  it('destino en otra sucursal: muestra observaciones y habilita Enviar con destinationBranchId', () => {
    setInputs({ ...LOTE, branch: 'NORTE — Belgrano', destinationBranchId: 1002 });
    const obs = fixture.debugElement.query(By.css('input.obs'));
    expect(obs).not.toBeNull();
    expect(fixture.debugElement.query(By.css('button.send')).nativeElement.disabled).toBe(false);

    const patches: LoteDestPatch[] = [];
    fixture.componentInstance.destChange.subscribe(p => patches.push(p));
    obs.nativeElement.value = 'cadena de frío';
    obs.nativeElement.dispatchEvent(new Event('change'));
    expect(patches).toEqual([{ observation: 'cadena de frío' }]);
  });

  it('el select de sección muestra el label compuesto (incluye sucursal destino cuando es otra)', () => {
    setInputs({ ...LOTE, branch: 'CENTRAL — Sede Central' });
    const options = fixture.debugElement.queryAll(
      By.css('select[aria-label="Sección de destino"] option'),
    );
    const texts = options.map(o => (o.nativeElement.textContent as string).trim());
    expect(texts).toContain('Hematología · Citometría');
    expect(texts).toContain('Bacteriología · Microbiología (→ NORTE)');
  });

  it('cambiar sucursal emite destChange con el id real y resetea la sección', () => {
    setInputs();
    const patches: LoteDestPatch[] = [];
    fixture.componentInstance.destChange.subscribe(p => patches.push(p));
    const select = fixture.debugElement.query(By.css('select[aria-label="Sucursal de destino"]'));
    select.nativeElement.value = 'NORTE — Belgrano';
    select.nativeElement.dispatchEvent(new Event('change'));
    expect(patches).toEqual([{
      branch: 'NORTE — Belgrano', destinationBranchId: 1002,
      sectionId: null, area: '', section: '',
    }]);
  });
});
