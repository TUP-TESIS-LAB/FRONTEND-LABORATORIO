import { describe, it, expect } from 'vitest';
import { initialFinancieroState } from './financiero.state';
import { FINANCIERO_FEATURE_KEY } from './financiero.state';
import {
  selectLiqList, selectLiqInsurersIndex, selectLiqInsurerPlans,
} from './financiero.selectors';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';

const insurer: InsurerSummary = {
  id: 7, code: 'OS7', acronym: 'OS', name: 'IOMA', insurerType: 'SOCIAL', insurerTypeName: 'Obra Social', active: true,
};

function root(partial: Partial<typeof initialFinancieroState.liquidaciones>) {
  return { [FINANCIERO_FEATURE_KEY]: { ...initialFinancieroState, liquidaciones: { ...initialFinancieroState.liquidaciones, ...partial } } };
}

describe('selectors de liquidaciones', () => {
  it('selectLiqList devuelve la lista', () => {
    expect(selectLiqList(root({ list: [] }))).toEqual([]);
  });

  it('selectLiqInsurersIndex arma un Map id→nombre', () => {
    const map = selectLiqInsurersIndex(root({ insurers: [insurer] }));
    expect(map.get(7)).toBe('IOMA');
  });

  it('selectLiqInsurerPlans devuelve los planes de la OS elegida', () => {
    const plans = [{ id: 3, name: 'Plan A', iva: 21 }];
    expect(selectLiqInsurerPlans(root({ insurerPlans: plans }))).toEqual(plans);
  });
});
