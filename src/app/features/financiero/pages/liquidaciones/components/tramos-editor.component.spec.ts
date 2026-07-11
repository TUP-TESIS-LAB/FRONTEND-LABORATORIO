import { validateTramos, tramosToRules } from './tramos-editor.component';

describe('validateTramos', () => {
  it('acepta tramos contiguos desde 1 con último abierto', () => {
    expect(validateTramos([{ desde: 1, hasta: 3, valorUb: 500 }, { desde: 4, hasta: null, valorUb: 900 }])).toBeNull();
  });
  it('rechaza si no arranca en 1', () => {
    expect(validateTramos([{ desde: 2, hasta: null, valorUb: 500 }])).toMatch(/desde 1/i);
  });
  it('rechaza hueco entre tramos', () => {
    expect(validateTramos([{ desde: 1, hasta: 3, valorUb: 500 }, { desde: 5, hasta: null, valorUb: 900 }])).toMatch(/hueco|contiguo/i);
  });
  it('rechaza valor <= 0', () => {
    expect(validateTramos([{ desde: 1, hasta: null, valorUb: 0 }])).toMatch(/valor/i);
  });
  it('rechaza lista vacía', () => {
    expect(validateTramos([])).toMatch(/al menos un tramo/i);
  });
});

describe('tramosToRules', () => {
  it('mapea cerrado a BETWEEN y abierto a GREATER_THAN(desde-1)', () => {
    expect(tramosToRules([{ desde: 1, hasta: 3, valorUb: 500 }, { desde: 4, hasta: null, valorUb: 900 }])).toEqual([
      { ruleType: 'BETWEEN', fromCount: 1, toCount: 3, amount: 500 },
      { ruleType: 'GREATER_THAN', fromCount: 3, amount: 900 },
    ]);
  });
});
