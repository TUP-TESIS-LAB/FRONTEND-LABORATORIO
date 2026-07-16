import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TakePatientModalComponent } from './take-patient-modal.component';
import { AwaitingExtractionItem, BoxAssignment } from '../../models/extraction.model';

// ── Factories ────────────────────────────────────────────────────────────────

function makePatient(overrides: Partial<AwaitingExtractionItem> = {}): AwaitingExtractionItem {
  return {
    id: 1,
    patientId: 10,
    patientFullName: 'García, Lucía',
    patientDni: '38000111',
    patientBirthDate: null,
    patientGender: null,
    attentionNumber: 'A-42',
    publicCode: null,
    isUrgent: false,
    analysisCount: 3,
    insurancePlanLabel: null,
    createdAt: '2026-06-01T10:00:00Z',
    waitMinutes: 5,
    samples: [
      // Valores crudos del enum backend (SampleType). La UI los traduce.
      { sampleType: 'BLOOD', count: 2 },
      { sampleType: 'URINE', count: 1 },
    ],
    ...overrides,
  };
}

function makeBox(
  boxNumber: number,
  extractorId: number | null,
  extractorFullName: string | null,
): BoxAssignment {
  return { boxNumber, extractorId, extractorFullName };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function dispatchKey(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TakePatientModalComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations()],
    });
  });

  // ── boxRows computed ────────────────────────────────────────────────────────

  describe('boxRows()', () => {
    it('maps libre: extractor configurado y NO en inProgressExtractorIds', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('boxes', [makeBox(1, 5, 'Pérez')]);
      fixture.componentRef.setInput('inProgressExtractorIds', []);
      fixture.detectChanges();

      const rows = fixture.componentInstance.boxRows();
      expect(rows.length).toBe(1);
      expect(rows[0].state).toBe('libre');
      expect(rows[0].fKey).toBe('F1');
      expect(rows[0].boxNumber).toBe(1);
    });

    it('maps ocupado: extractor configurado y SÍ en inProgressExtractorIds', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('boxes', [makeBox(2, 7, 'Gómez')]);
      fixture.componentRef.setInput('inProgressExtractorIds', [7]);
      fixture.detectChanges();

      const rows = fixture.componentInstance.boxRows();
      expect(rows[0].state).toBe('ocupado');
    });

    it('maps sin-asignar: extractorId null', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('boxes', [makeBox(3, null, null)]);
      fixture.componentRef.setInput('inProgressExtractorIds', []);
      fixture.detectChanges();

      const rows = fixture.componentInstance.boxRows();
      expect(rows[0].state).toBe('sin-asignar');
    });

    it('ordena los boxes por boxNumber aunque vengan desordenados', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('boxes', [
        makeBox(3, 3, 'C'),
        makeBox(1, 1, 'A'),
        makeBox(2, 2, 'B'),
      ]);
      fixture.componentRef.setInput('inProgressExtractorIds', []);
      fixture.detectChanges();

      const rows = fixture.componentInstance.boxRows();
      expect(rows.map((r) => r.boxNumber)).toEqual([1, 2, 3]);
      expect(rows.map((r) => r.fKey)).toEqual(['F1', 'F2', 'F3']);
    });
  });

  // ── F-keys ──────────────────────────────────────────────────────────────────

  describe('Teclas F1..Fn', () => {
    it('F1 emite assign(boxNumber) si el box 1 está libre y el modal está visible', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('patient', makePatient());
      fixture.componentRef.setInput('boxes', [makeBox(1, 5, 'Pérez')]);
      fixture.componentRef.setInput('inProgressExtractorIds', []);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const emitted: number[] = [];
      fixture.componentInstance.assign.subscribe((n) => emitted.push(n));

      dispatchKey('F1');

      expect(emitted).toEqual([1]);
    });

    it('F1 cierra el modal tras asignar', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('patient', makePatient());
      fixture.componentRef.setInput('boxes', [makeBox(1, 5, 'Pérez')]);
      fixture.componentRef.setInput('inProgressExtractorIds', []);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      fixture.componentInstance.assign.subscribe(() => {});
      dispatchKey('F1');

      expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('F2 sobre un box OCUPADO NO emite assign', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('patient', makePatient());
      fixture.componentRef.setInput('boxes', [
        makeBox(1, 5, 'Pérez'),  // libre  → F1
        makeBox(2, 7, 'Gómez'),  // ocupado → F2
      ]);
      fixture.componentRef.setInput('inProgressExtractorIds', [7]);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const emitted: number[] = [];
      fixture.componentInstance.assign.subscribe((n) => emitted.push(n));

      dispatchKey('F2');

      expect(emitted).toHaveLength(0);
    });

    it('F1 sobre un box sin-asignar NO emite assign', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('patient', makePatient());
      fixture.componentRef.setInput('boxes', [makeBox(1, null, null)]);
      fixture.componentRef.setInput('inProgressExtractorIds', []);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const emitted: number[] = [];
      fixture.componentInstance.assign.subscribe((n) => emitted.push(n));

      dispatchKey('F1');

      expect(emitted).toHaveLength(0);
    });

    it('teclas F NO se disparan cuando el modal está cerrado', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('boxes', [makeBox(1, 5, 'Pérez')]);
      fixture.componentRef.setInput('inProgressExtractorIds', []);
      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();

      const emitted: number[] = [];
      fixture.componentInstance.assign.subscribe((n) => emitted.push(n));

      dispatchKey('F1');

      expect(emitted).toHaveLength(0);
    });

    it('F de índice fuera de rango (más boxes que teclas disponibles) no hace nada', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('boxes', [makeBox(1, 5, 'A')]);
      fixture.componentRef.setInput('inProgressExtractorIds', []);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const emitted: number[] = [];
      fixture.componentInstance.assign.subscribe((n) => emitted.push(n));

      dispatchKey('F10'); // solo hay 1 box → F10 está fuera de rango

      expect(emitted).toHaveLength(0);
    });
  });

  // ── Escape ──────────────────────────────────────────────────────────────────

  describe('Escape', () => {
    it('Escape cierra el modal (visible=false)', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      dispatchKey('Escape');

      expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('Escape NO emite assign', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('boxes', [makeBox(1, 5, 'Pérez')]);
      fixture.componentRef.setInput('inProgressExtractorIds', []);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const emitted: number[] = [];
      fixture.componentInstance.assign.subscribe((n) => emitted.push(n));

      dispatchKey('Escape');

      expect(emitted).toHaveLength(0);
    });
  });

  // ── onBoxClick ───────────────────────────────────────────────────────────────

  describe('onBoxClick()', () => {
    it('emite assign y cierra cuando el box está libre', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('boxes', [makeBox(4, 9, 'Rodríguez')]);
      fixture.componentRef.setInput('inProgressExtractorIds', []);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const c = fixture.componentInstance;
      const emitted: number[] = [];
      c.assign.subscribe((n) => emitted.push(n));

      c.onBoxClick(c.boxRows()[0]);

      expect(emitted).toEqual([4]);
      expect(c.visible()).toBe(false);
    });

    it('NO emite cuando el box está ocupado', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      fixture.componentRef.setInput('boxes', [makeBox(2, 8, 'Torres')]);
      fixture.componentRef.setInput('inProgressExtractorIds', [8]);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const c = fixture.componentInstance;
      const emitted: number[] = [];
      c.assign.subscribe((n) => emitted.push(n));

      c.onBoxClick(c.boxRows()[0]);

      expect(emitted).toHaveLength(0);
    });
  });

  // ── Muestras ─────────────────────────────────────────────────────────────────

  describe('Sección muestras', () => {
    it('patient con muestras expone los samples en boxRows context (smoke)', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      const patient = makePatient({ samples: [{ sampleType: 'BLOOD', count: 2 }] });
      fixture.componentRef.setInput('patient', patient);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      expect(fixture.componentInstance.patient()?.samples).toHaveLength(1);
      expect(fixture.componentInstance.patient()?.samples[0].sampleType).toBe('BLOOD');
    });

    it('renderiza el tipo de muestra traducido al español, nunca el enum crudo', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      const patient = makePatient({ samples: [{ sampleType: 'BLOOD', count: 3 }] });
      fixture.componentRef.setInput('patient', patient);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Sangre');
      expect(text).not.toContain('BLOOD');
    });
  });

  // ── publicCode display ────────────────────────────────────────────────────────

  describe('Número de turno (publicCode)', () => {
    it('muestra publicCode cuando está presente', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      const patient = makePatient({ publicCode: 'CT-0001', attentionNumber: 'A-1' });
      fixture.componentRef.setInput('patient', patient);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('CT-0001');
    });

    it('cae en attentionNumber cuando publicCode es null', () => {
      const fixture = TestBed.createComponent(TakePatientModalComponent);
      const patient = makePatient({ publicCode: null, attentionNumber: 'A-1' });
      fixture.componentRef.setInput('patient', patient);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('A-1');
    });
  });
});
