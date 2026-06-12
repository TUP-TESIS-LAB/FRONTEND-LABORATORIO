import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { RecommendedGroupCardComponent } from './recommended-group-card.component';
import type { Sample } from '../../../models/sample.model';
import type { RecommendedGroup } from '../../../models/transito.model';

const GROUP: RecommendedGroup = {
  id: 'CENTRAL — Sede Central|Hematología|Citometría',
  branch: 'CENTRAL — Sede Central', area: 'Hematología', section: 'Citometría',
  sampleIds: ['s-1'],
};
const SAMPLE: Sample = {
  id: 's-1', barcode: 'MX-2606-00001', study: 'Hemograma completo',
  patient: 'García, M.', branch: 'NORTE — Belgrano',
  date: '07/06', time: '08:00', urgent: false, state: 'transito',
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
