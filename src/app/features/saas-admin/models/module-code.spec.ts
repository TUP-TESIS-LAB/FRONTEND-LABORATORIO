import { MODULE_CATALOG } from './module-code';

describe('MODULE_CATALOG', () => {
  it('no incluye el modulo FAMILIA (fusionado en PORTAL)', () => {
    expect(MODULE_CATALOG.some(m => (m.code as string) === 'FAMILIA')).toBe(false);
  });

  it('mantiene PORTAL como activable', () => {
    expect(MODULE_CATALOG.some(m => m.code === 'PORTAL' && m.kind === 'ACTIVABLE')).toBe(true);
  });
});
