import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SampleTableComponent } from './sample-table.component';
import type { Sample } from '../../models/sample.model';
import type { Tube } from '../../models/tube.model';

function makeSample(over: Partial<Sample> = {}): Sample {
  return {
    id: 's-1', barcode: 'MX-001', study: 'Hemograma',
    patient: 'García, M.', branch: 'CENTRAL',
    date: '12/06', time: '10:00', urgent: false, state: 'collected',
    ...over,
  };
}

function makeTube(sampleId: number, labels: { labelId: number; barcode: string; name: string }[]): Tube {
  return {
    id: `t${sampleId}`,
    sampleId,
    labelIds: labels.map(l => l.labelId),
    analyses: labels,
    barcode: labels.map(l => l.barcode).join(' '),
    study: labels.length === 1 ? labels[0].name : `${labels.length} análisis`,
    patient: 'García, M.',
    branch: 'CENTRAL',
    date: '12/06',
    time: '10:00',
    urgent: false,
    state: 'collected',
  };
}

describe('SampleTableComponent', () => {
  let fixture: ComponentFixture<SampleTableComponent>;
  let component: SampleTableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SampleTableComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(SampleTableComponent);
    component = fixture.componentInstance;
  });

  function setInputs(
    rows: Sample[],
    selectedIds: ReadonlySet<string> = new Set(),
    screenKey: 'recoleccion' | 'traslado' | 'procesamiento' | 'descarte' = 'recoleccion',
  ): void {
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('selectedIds', selectedIds);
    fixture.componentRef.setInput('screenKey', screenKey);
    fixture.detectChanges();
  }

  it('renderiza una fila por muestra simple sin caret', () => {
    const row = makeSample({ id: 's-1', barcode: 'MX-001' });
    setInputs([row]);
    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(el.querySelector('.caret-btn')).toBeNull();
  });

  it('muestra el caret en una fila con tubo de 2 análisis', () => {
    const tube = makeTube(100, [
      { labelId: 1001, barcode: 'B001', name: 'Hemograma' },
      { labelId: 1002, barcode: 'B002', name: 'Glucosa' },
    ]);
    setInputs([tube]);
    const el = fixture.nativeElement as HTMLElement;
    const caretBtn = el.querySelector('.caret-btn');
    expect(caretBtn).not.toBeNull();
    const icon = caretBtn!.querySelector('.pi-chevron-right');
    expect(icon).not.toBeNull();
  });

  it('no muestra caret en tubo de análisis único', () => {
    const tube = makeTube(200, [
      { labelId: 2001, barcode: 'C001', name: 'Hemograma' },
    ]);
    setInputs([tube]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.caret-btn')).toBeNull();
  });

  it('al clickear el caret expande la fila y muestra los análisis', async () => {
    const tube = makeTube(300, [
      { labelId: 3001, barcode: 'D001', name: 'Hemograma' },
      { labelId: 3002, barcode: 'D002', name: 'Colesterol' },
    ]);
    setInputs([tube]);
    const el = fixture.nativeElement as HTMLElement;

    // No debe existir la fila de expansión antes de clickear
    expect(el.querySelector('.expansion-row')).toBeNull();

    const caretBtn = el.querySelector('.caret-btn') as HTMLButtonElement;
    caretBtn.click();
    fixture.detectChanges();

    const expansionRow = el.querySelector('.expansion-row');
    expect(expansionRow).not.toBeNull();

    const items = el.querySelectorAll('.analysis-item');
    expect(items.length).toBe(2);

    const names = Array.from(items).map(i => i.querySelector('.analysis-name')?.textContent?.trim());
    expect(names).toContain('Hemograma');
    expect(names).toContain('Colesterol');
  });

  it('al clickear caret por segunda vez, colapsa la fila', () => {
    const tube = makeTube(400, [
      { labelId: 4001, barcode: 'E001', name: 'TGO' },
      { labelId: 4002, barcode: 'E002', name: 'TGP' },
    ]);
    setInputs([tube]);
    const el = fixture.nativeElement as HTMLElement;

    const caretBtn = el.querySelector('.caret-btn') as HTMLButtonElement;
    caretBtn.click();
    fixture.detectChanges();
    expect(el.querySelector('.expansion-row')).not.toBeNull();

    caretBtn.click();
    fixture.detectChanges();
    expect(el.querySelector('.expansion-row')).toBeNull();
  });

  it('el click en caret NO propaga al toggleRow de la fila', () => {
    const tube = makeTube(500, [
      { labelId: 5001, barcode: 'F001', name: 'Ferritina' },
      { labelId: 5002, barcode: 'F002', name: 'Hierro' },
    ]);
    setInputs([tube]);

    const toggleEmitted: string[] = [];
    component.toggleRow.subscribe((id: string) => toggleEmitted.push(id));

    const caretBtn = (fixture.nativeElement as HTMLElement).querySelector('.caret-btn') as HTMLButtonElement;
    caretBtn.click();
    fixture.detectChanges();

    expect(toggleEmitted).toHaveLength(0);
  });

  it('muestra mensaje vacío con colspan 7 cuando no hay filas', () => {
    setInputs([]);
    const el = fixture.nativeElement as HTMLElement;
    const emptyTd = el.querySelector('tr.empty td');
    expect(emptyTd).not.toBeNull();
    expect(emptyTd!.getAttribute('colspan')).toBe('7');
    expect(emptyTd!.textContent).toContain('No hay muestras');
  });
});
