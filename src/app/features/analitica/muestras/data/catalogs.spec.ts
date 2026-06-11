import { describe, it, expect } from 'vitest';
import { STUDIES, SECTIONS, STUDY_AREA, AREA_SECTION, AREA_BRANCH, AREAS, BRANCHES } from './catalogs';

describe('catalogs — extensión Tránsito', () => {
  it('SECTIONS tiene las 11 secciones del handoff', () => {
    expect(SECTIONS).toContain('Autoanalizador A1');
    expect(SECTIONS).toContain('Citometría');
    expect(SECTIONS).toContain('Guardia / Urgencias');
    expect(SECTIONS.length).toBe(11);
  });

  it('STUDY_AREA cubre cada estudio listado en STUDIES', () => {
    for (const s of STUDIES) {
      expect(STUDY_AREA[s], `estudio sin mapeo a área: ${s}`).toBeDefined();
    }
  });

  it('AREA_SECTION cubre cada área usada en STUDY_AREA', () => {
    const usedAreas = new Set(Object.values(STUDY_AREA));
    for (const a of usedAreas) {
      expect(AREA_SECTION[a], `área sin sección default: ${a}`).toBeDefined();
    }
  });

  it('AREA_BRANCH cubre cada área usada en STUDY_AREA', () => {
    const usedAreas = new Set(Object.values(STUDY_AREA));
    for (const a of usedAreas) {
      expect(AREA_BRANCH[a], `área sin sucursal de procesamiento: ${a}`).toBeDefined();
    }
  });

  it('los valores de AREA_BRANCH están en BRANCHES y AREA_SECTION en SECTIONS', () => {
    for (const b of Object.values(AREA_BRANCH)) expect(BRANCHES).toContain(b);
    for (const s of Object.values(AREA_SECTION)) expect(SECTIONS).toContain(s);
  });

  it('STUDIES fusiona los del worklist con los del handoff sin duplicar', () => {
    const set = new Set(STUDIES);
    expect(set.size).toBe(STUDIES.length);
    expect(STUDIES).toContain('Hemograma completo'); // del worklist
    expect(STUDIES).toContain('TSH');                // del handoff
  });

  it('los valores de STUDY_AREA están en AREAS', () => {
    for (const a of Object.values(STUDY_AREA)) expect(AREAS).toContain(a);
  });
});
