import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { RecommendedGroupCardComponent } from './recommended-group-card.component';
import type { Sample } from '../../../models/sample.model';
import type { RecommendedGroup, SectionOption } from '../../../models/transito.model';
import { SIN_DESTINO_GROUP_ID } from '../../../models/transito.model';

const GROUP: RecommendedGroup = {
  id: 'CENTRAL — Sede Central|Hematología|Citometría',
  branch: 'CENTRAL — Sede Central', area: 'Hematología', section: 'Citometría',
  sampleIds: ['s-1'],
};
const SAMPLE: Sample = {
  id: 's-1', barcode: 'MX-2606-00001', study: 'Hemograma completo',
  patient: 'García, M.', branch: 'NORTE — Belgrano',
  receivedAt: '2026-06-07T08:00:00Z', urgent: false, state: 'transito',
};

describe('RecommendedGroupCardComponent', () => {
  let fixture: ComponentFixture<RecommendedGroupCardComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendedGroupCardComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(RecommendedGroupCardComponent);
  });

  it('muestra área, sucursal, sección y contador', () => {
    fixture.componentRef.setInput('group', GROUP);
    fixture.componentRef.setInput('samples', [SAMPLE]);
    fixture.componentRef.setInput('selectedIds', new Set<string>());
    fixture.componentRef.setInput('isEditing', false);
    fixture.componentRef.setInput('leavingIds', new Set<string>());
    fixture.componentRef.setInput('flashId', null);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Hematología');
    expect(text).toContain('CENTRAL');
    expect(text).toContain('Citometría');
    expect(text).toContain('1 muestra');
  });

  it('emite toggleEditing al clickear Editar destino', () => {
    fixture.componentRef.setInput('group', GROUP);
    fixture.componentRef.setInput('samples', [SAMPLE]);
    fixture.componentRef.setInput('selectedIds', new Set<string>());
    fixture.componentRef.setInput('isEditing', false);
    fixture.componentRef.setInput('leavingIds', new Set<string>());
    fixture.componentRef.setInput('flashId', null);
    fixture.detectChanges();
    let count = 0;
    fixture.componentInstance.toggleEditing.subscribe(() => count++);
    fixture.debugElement.query(By.css('button.edit')).nativeElement.click();
    expect(count).toBe(1);
  });
});

describe('RecommendedGroupCardComponent — variante Sin destino', () => {
  let fixture: ComponentFixture<RecommendedGroupCardComponent>;

  const SIN_DESTINO: RecommendedGroup = {
    id: SIN_DESTINO_GROUP_ID, branch: '', area: '', section: '', sampleIds: ['s-1'],
  };
  const SECTION_OPTIONS: SectionOption[] = [
    { sectionId: 10, sectionName: 'Citometría', areaName: 'Hematología', label: 'Hematología · Citometría' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendedGroupCardComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(RecommendedGroupCardComponent);
  });

  function setInputs(group: RecommendedGroup = SIN_DESTINO, assignedSectionId: number | null = null) {
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('samples', [SAMPLE]);
    fixture.componentRef.setInput('selectedIds', new Set<string>());
    fixture.componentRef.setInput('isEditing', false);
    fixture.componentRef.setInput('leavingIds', new Set<string>());
    fixture.componentRef.setInput('flashId', null);
    fixture.componentRef.setInput('sectionOptions', SECTION_OPTIONS);
    fixture.componentRef.setInput('reasons', new Map([['s-1', 'El análisis no tiene sección configurada']]));
    fixture.componentRef.setInput('assignedSectionId', assignedSectionId);
    fixture.detectChanges();
  }

  it('muestra badge Sin destino, motivo por tubo y selector de sección; Enviar deshabilitado', () => {
    setInputs();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sin destino');
    expect(text).toContain('El análisis no tiene sección configurada');
    expect(fixture.debugElement.query(By.css('select[aria-label="Sección de destino"]'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('button.send')).nativeElement.disabled).toBe(true);
    // sin botón "Editar destino": la asignación es por el selector
    expect(fixture.debugElement.query(By.css('button.edit'))).toBeNull();
  });

  it('emite assignSection al elegir una sección', () => {
    setInputs();
    const emitted: number[] = [];
    fixture.componentInstance.assignSection.subscribe(id => emitted.push(id));
    const select = fixture.debugElement.query(By.css('select[aria-label="Sección de destino"]'));
    select.nativeElement.value = '10';
    select.nativeElement.dispatchEvent(new Event('change'));
    expect(emitted).toEqual([10]);
  });

  it('con sección asignada deja de estar pendiente y habilita Enviar', () => {
    setInputs({ ...SIN_DESTINO, branch: 'CENTRAL', area: 'Hematología', section: 'Citometría' }, 10);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('En proceso');
    expect(fixture.debugElement.query(By.css('button.send')).nativeElement.disabled).toBe(false);
  });
});
