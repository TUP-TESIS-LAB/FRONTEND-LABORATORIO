import { describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { ValidacionProtocolosPage } from './validacion-protocolos.page';
import { selectValidacionRows, selectValidacionPending } from '../../store/validacion-protocolos/validacion-protocolos.selectors';
import { estadoFirmaDe, type ValidationListRow } from '../../models/postanalitica.model';

const SMOKE_TEMPLATE = `<span class="c">{{ cSin() }}-{{ cParcial() }}-{{ cTotal() }}</span><span class="v">{{ visibles().length }}</span>`;

function row(p: Partial<ValidationListRow>): ValidationListRow {
  return {
    studyId: 1, protocolId: 1, protocolCode: 'P-0001',
    patientName: 'Paciente', patientSex: 'F', patientBirthDate: '1990-01-01',
    date: '2026-06-14T10:00:00Z', currentStatus: 'PENDING',
    analysisCount: 2, determinationCount: 5, signedAnalysisCount: 0,
    ...p,
  };
}

const ROWS: ValidationListRow[] = [
  row({ studyId: 1, protocolId: 11, protocolCode: 'P-0001', patientName: 'García, Ana', currentStatus: 'PENDING' }),
  row({ studyId: 2, protocolId: 12, protocolCode: 'P-0002', patientName: 'López, Beto', currentStatus: 'PARTIALLY_SIGNED' }),
  row({ studyId: 3, protocolId: 13, protocolCode: 'P-0003', patientName: 'Pérez, Carla', currentStatus: 'CLOSED' }),
];

function setup(): { fx: ComponentFixture<ValidacionProtocolosPage>; navigate: ReturnType<typeof vi.fn> } {
  const navigate = vi.fn();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ValidacionProtocolosPage],
    providers: [
      provideNoopAnimations(),
      { provide: Router, useValue: { navigate } },
      provideMockStore({ selectors: [
        { selector: selectValidacionRows, value: ROWS },
        { selector: selectValidacionPending, value: false },
      ] }),
    ],
  });
  TestBed.overrideTemplate(ValidacionProtocolosPage, SMOKE_TEMPLATE);
  const fx = TestBed.createComponent(ValidacionProtocolosPage);
  fx.detectChanges();
  return { fx, navigate };
}

describe('ValidacionProtocolosPage (smoke)', () => {
  it('los contadores por estado de firma suman el total de filas', () => {
    const c = setup().fx.componentInstance;
    expect(c.cSin() + c.cParcial() + c.cTotal()).toBe(ROWS.length);
  });

  it('arranca mostrando todas las filas (filtro "todos")', () => {
    expect(setup().fx.componentInstance.visibles().length).toBe(ROWS.length);
  });

  it('el filtro "sin" deja solo filas sin firma', () => {
    const c = setup().fx.componentInstance;
    c.setFiltro('sin');
    expect(c.visibles().every(r => estadoFirmaDe(r.currentStatus) === 'sin')).toBe(true);
    expect(c.visibles().length).toBe(c.cSin());
  });

  it('la búsqueda por paciente filtra el listado', () => {
    const c = setup().fx.componentInstance;
    c.setQ('garcía');
    expect(c.visibles().length).toBe(1);
    expect(c.visibles()[0].patientName).toContain('García');
  });

  it('validar navega al detalle del protocolo', () => {
    const { fx, navigate } = setup();
    const r = ROWS[0];
    fx.componentInstance.validar(r, new Event('click'));
    expect(navigate).toHaveBeenCalledWith(['/analitica/validacion', r.protocolId], {
      state: { patientName: r.patientName, patientSex: r.patientSex, patientBirthDate: r.patientBirthDate },
    });
  });
});
