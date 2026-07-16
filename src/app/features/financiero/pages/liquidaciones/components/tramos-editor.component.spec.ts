import { validateTramos, tramosToRules, addTramoRow, removeTramoRow, copyTramosFrom } from './tramos-editor.component';

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
  it('rechaza si el último tramo no queda abierto', () => {
    expect(validateTramos([{ desde: 1, hasta: 3, valorUb: 500 }])).toMatch(/abierto/i);
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

describe('addTramoRow', () => {
  it('cierra el anterior (abierto) y agrega uno contiguo y abierto', () => {
    const result = addTramoRow([{ desde: 1, hasta: null, valorUb: 500 }]);
    expect(result).toEqual([
      { desde: 1, hasta: 1, valorUb: 500 },
      { desde: 2, hasta: null, valorUb: null },
    ]);
  });
  it('el nuevo desde arranca en hasta_anterior+1 cuando el anterior ya estaba cerrado', () => {
    const result = addTramoRow([{ desde: 1, hasta: 3, valorUb: 500 }]);
    expect(result).toEqual([
      { desde: 1, hasta: 3, valorUb: 500 },
      { desde: 4, hasta: null, valorUb: null },
    ]);
  });
  it('no muta la entrada', () => {
    const input = [{ desde: 1, hasta: null, valorUb: 500 }];
    addTramoRow(input);
    expect(input).toEqual([{ desde: 1, hasta: null, valorUb: 500 }]);
  });
});

describe('removeTramoRow', () => {
  it('borrar el último (abierto) deja el nuevo último abierto → GREATER_THAN, no BETWEEN', () => {
    const result = removeTramoRow(
      [{ desde: 1, hasta: 3, valorUb: 500 }, { desde: 4, hasta: null, valorUb: 900 }],
      1,
    );
    expect(result).toEqual([{ desde: 1, hasta: null, valorUb: 500 }]);
    expect(validateTramos(result)).toBeNull();
    expect(tramosToRules(result)).toEqual([{ ruleType: 'GREATER_THAN', fromCount: 0, amount: 500 }]);
  });
  it('borrar una fila del medio preserva la contigüidad desde 1', () => {
    const result = removeTramoRow(
      [
        { desde: 1, hasta: 3, valorUb: 500 },
        { desde: 4, hasta: 6, valorUb: 700 },
        { desde: 7, hasta: null, valorUb: 900 },
      ],
      1,
    );
    expect(result).toEqual([
      { desde: 1, hasta: 3, valorUb: 500 },
      { desde: 4, hasta: null, valorUb: 900 },
    ]);
    expect(validateTramos(result)).toBeNull();
  });
  it('no muta la entrada', () => {
    const input = [{ desde: 1, hasta: 3, valorUb: 500 }, { desde: 4, hasta: null, valorUb: 900 }];
    removeTramoRow(input, 1);
    expect(input).toEqual([{ desde: 1, hasta: 3, valorUb: 500 }, { desde: 4, hasta: null, valorUb: 900 }]);
  });
});

describe('copyTramosFrom', () => {
  it('devuelve una copia con el mismo contenido', () => {
    const source = [{ desde: 1, hasta: 3, valorUb: 500 }, { desde: 4, hasta: null, valorUb: 900 }];
    expect(copyTramosFrom(source)).toEqual(source);
  });
  it('es un deep copy: no comparte referencias de fila con el origen', () => {
    const source = [{ desde: 1, hasta: null, valorUb: 500 }];
    const copy = copyTramosFrom(source);
    copy[0].valorUb = 999;
    expect(source[0].valorUb).toBe(500);
  });
  it('no muta la entrada', () => {
    const source = [{ desde: 1, hasta: null, valorUb: 500 }];
    copyTramosFrom(source);
    expect(source).toEqual([{ desde: 1, hasta: null, valorUb: 500 }]);
  });
  it('copia lista vacía como lista vacía', () => {
    expect(copyTramosFrom([])).toEqual([]);
  });
});
