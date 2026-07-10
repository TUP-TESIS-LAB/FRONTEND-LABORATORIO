import { SectionListItem } from '../../models/section-list-item.model';
import {
  selectSecciones,
  selectCountMap,
  selectUnassignedCount,
  selectSeccionesConCount,
} from './secciones.selectors';
import { SECCIONES_FEATURE_KEY, SeccionesState, initialSeccionesState } from './secciones.state';

describe('secciones selectors', () => {
  const secciones: SectionListItem[] = [
    { id: 1, name: 'Hematología', active: true, branches: [] },
    { id: 2, name: 'Química', active: true, branches: [] },
  ];

  const state: SeccionesState = {
    ...initialSeccionesState,
    secciones,
    countMap: { 1: 4 }, // la sección 2 NO tiene entrada → debe caer al default 0
    unassignedCount: 7,
  };

  const globalState = { [SECCIONES_FEATURE_KEY]: state };

  it('selectSecciones devuelve la lista', () => {
    expect(selectSecciones.projector(state)).toEqual(secciones);
  });

  it('selectCountMap devuelve el mapa', () => {
    expect(selectCountMap.projector(state)).toEqual({ 1: 4 });
  });

  it('selectUnassignedCount devuelve el conteo', () => {
    expect(selectUnassignedCount.projector(state)).toBe(7);
  });

  it('selectSeccionesConCount mergea el count y usa ?? 0 para secciones sin entrada', () => {
    const result = selectSeccionesConCount.projector(secciones, { 1: 4 });
    expect(result).toEqual([
      { id: 1, name: 'Hematología', active: true, branches: [], analysisCount: 4 },
      { id: 2, name: 'Química', active: true, branches: [], analysisCount: 0 },
    ]);
  });

  it('los selectores leen del feature key registrado', () => {
    expect(selectSecciones(globalState)).toEqual(secciones);
  });
});
