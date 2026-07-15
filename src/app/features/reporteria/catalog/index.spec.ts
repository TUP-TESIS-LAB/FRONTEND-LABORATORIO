import { describe, it, expect } from 'vitest';
import { ALL_REPORTS, REPORT_GROUPS, findReportById } from './index';

describe('catálogo de reportes', () => {
  it('tiene los 17 reportes de KAN-244', () => {
    expect(ALL_REPORTS).toHaveLength(17);
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
    expect(findReportById('R-PAC-01')?.title).toBe('Listado de pacientes');
    expect(findReportById('NOPE')).toBeUndefined();
  });

  it('REPORT_GROUPS agrupa los 5 módulos', () => {
    expect(REPORT_GROUPS.map((g) => g.key)).toEqual(['pacientes', 'medicos', 'empleados', 'sucursales', 'usuarios']);
  });
});
