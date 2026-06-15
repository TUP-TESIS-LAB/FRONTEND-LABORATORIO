import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { ValidacionProtocolosPage } from './validacion-protocolos.page';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { selectValidacionRows, selectValidacionPending } from '../../store/validacion-protocolos/validacion-protocolos.selectors';
import { estadoFirmaListado, type ValidationListRow } from '../../models/postanalitica.model';

const SMOKE_TEMPLATE = `<span class="c">{{ cSin() }}-{{ cParcial() }}-{{ cListo() }}-{{ cCerrado() }}</span><span class="v">{{ visibles().length }}</span>`;

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
  row({ studyId: 3, protocolId: 13, protocolCode: 'P-0003', patientName: 'Pérez, Carla', currentStatus: 'READY_FOR_SIGNATURE' }),
  row({ studyId: 4, protocolId: 14, protocolCode: 'P-0004', patientName: 'Díaz, Eva', currentStatus: 'CLOSED' }),
];

function setup(): { fx: ComponentFixture<ValidacionProtocolosPage>; navigate: ReturnType<typeof vi.fn>; getDetalle: ReturnType<typeof vi.fn> } {
  const navigate = vi.fn();
  const getDetalle = vi.fn().mockReturnValue(of({ study: {}, results: [] }));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ValidacionProtocolosPage],
    providers: [
      provideNoopAnimations(),
      { provide: Router, useValue: { navigate } },
      { provide: PostanaliticaApiService, useValue: { getDetalle } },
      provideMockStore({ selectors: [
        { selector: selectValidacionRows, value: ROWS },
        { selector: selectValidacionPending, value: false },
      ] }),
    ],
  });
  TestBed.overrideTemplate(ValidacionProtocolosPage, SMOKE_TEMPLATE);
  const fx = TestBed.createComponent(ValidacionProtocolosPage);
  fx.detectChanges();
  return { fx, navigate, getDetalle };
}

describe('ValidacionProtocolosPage (smoke)', () => {
  it('los contadores por estado suman el total de filas (GAP-5: sin/parcial/listo/cerrado)', () => {
    const c = setup().fx.componentInstance;
    expect(c.cSin() + c.cParcial() + c.cListo() + c.cCerrado()).toBe(ROWS.length);
    expect(c.cCerrado()).toBe(1);
    expect(c.cListo()).toBe(1);
  });

  it('arranca mostrando todas las filas (filtro "todos")', () => {
    expect(setup().fx.componentInstance.visibles().length).toBe(ROWS.length);
  });

  it('el filtro "cerrado" deja solo los CLOSED', () => {
    const c = setup().fx.componentInstance;
    c.setFiltro('cerrado');
    expect(c.visibles().every(r => estadoFirmaListado(r.currentStatus) === 'cerrado')).toBe(true);
    expect(c.visibles().length).toBe(c.cCerrado());
  });

  it('la búsqueda por paciente filtra el listado', () => {
    const c = setup().fx.componentInstance;
    c.setQ('garcía');
    expect(c.visibles().length).toBe(1);
    expect(c.visibles()[0].patientName).toContain('García');
  });

  it('toggle expande la fila y carga los análisis lazy (GAP-8)', () => {
    const { fx, getDetalle } = setup();
    const c = fx.componentInstance;
    const r = ROWS[0];
    expect(c.isOpen(r.protocolId)).toBe(false);
    c.toggle(r, new Event('click'));
    expect(c.isOpen(r.protocolId)).toBe(true);
    expect(getDetalle).toHaveBeenCalledWith(r.protocolId);
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
