import { describe, it, expect } from 'vitest';
import { ALL_REPORTS, REPORT_GROUPS, findReportById } from './index';

describe('catálogo de reportes', () => {
  it('tiene los 12 reportes de KAN-244 (parte 1 — se borraron los 5 listados, D1)', () => {
    expect(ALL_REPORTS).toHaveLength(12);
  });

  it('cada id de reporte es único', () => {
    const ids = ALL_REPORTS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos los reportes tienen al menos un rol y una columna', () => {
    for (const r of ALL_REPORTS) {
      expect(r.roles.length).toBeGreaterThan(0);
      expect(r.columns.length).toBeGreaterThan(0);
      expect(r.sortableFields.length).toBeGreaterThan(0);
    }
  });

  it('el defaultSort.field (si existe) pertenece a sortableFields', () => {
    for (const r of ALL_REPORTS) {
      if (r.defaultSort) expect(r.sortableFields).toContain(r.defaultSort.field);
    }
  });

  it('las columnas marcadas sortable son subconjunto de sortableFields', () => {
    for (const r of ALL_REPORTS) {
      const sortableCols = r.columns.filter((c) => c.sortable).map((c) => c.field);
      for (const f of sortableCols) expect(r.sortableFields).toContain(f);
    }
  });

  it('findReportById encuentra y devuelve undefined si no existe', () => {
    expect(findReportById('R-PAC-02')?.title).toBe('Altas de pacientes por período');
    expect(findReportById('NOPE')).toBeUndefined();
  });

  it('los 5 listados borrados (D1) ya no existen en el catálogo', () => {
    for (const id of ['R-PAC-01', 'R-MED-01', 'R-EMP-01', 'R-SUC-01', 'R-USR-01']) {
      expect(findReportById(id)).toBeUndefined();
    }
  });

  it('REPORT_GROUPS agrupa los 5 módulos', () => {
    expect(REPORT_GROUPS.map((g) => g.key)).toEqual(['pacientes', 'medicos', 'empleados', 'sucursales', 'usuarios']);
  });

  it('branchFilterable es opt-in: SOLO R-PAC-02/03/04/05 lo tienen en true (D2.1/D2.2)', () => {
    // Join contra AttentionJpaEntity (patientId+branchId): el único camino verificado
    // para llegar a sucursal desde el padrón. Empleados (D2.2) lo pedía (REP-KIT-06)
    // pero es irrealizable sin un puerto branch→users nuevo — no se fuerza. Médicos y
    // usuarios no tienen ninguna relación a sucursal en el modelo. El default (ausente)
    // tiene que fallar hacia lo seguro: filtro escondido, no un filtro que miente.
    const expectedTrue = ['R-PAC-02', 'R-PAC-03', 'R-PAC-04', 'R-PAC-05'];
    for (const r of ALL_REPORTS) {
      if (expectedTrue.includes(r.id)) expect(r.branchFilterable).toBe(true);
      else expect(r.branchFilterable).not.toBe(true);
    }
  });
});
