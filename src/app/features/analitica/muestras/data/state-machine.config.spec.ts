import { describe, expect, it } from 'vitest';
import { SCREENS } from './state-machine.config';
import type { ScreenKey, TransitionKey } from '../models/transition.model';

describe('SCREENS state machine config', () => {
  it('declara exactamente las 4 pantallas esperadas', () => {
    const keys: ScreenKey[] = ['recoleccion', 'traslado', 'procesamiento', 'descarte'];
    expect(Object.keys(SCREENS).sort()).toEqual([...keys].sort());
  });

  it('Recolección lista source=collected y targets transito/rejected/lost', () => {
    const s = SCREENS.recoleccion;
    expect(s.source).toBe('collected');
    const ks = s.targets.map(t => t.key);
    expect(ks).toEqual<TransitionKey[]>(['transito', 'rejected', 'lost']);
    expect(s.targets[0].fields).toEqual([]);
    // El badge "CAMINO FELIZ" se saco: era jerga interna en una pantalla de uso
    // clinico. El resto de los `reco` (RECEPCION, DESCARTE) si dicen algo al usuario.
    expect(s.targets[0].reco).toBeUndefined();
  });

  it('Traslado lista source=transito y target "area" exige areaFixed', () => {
    const s = SCREENS.traslado;
    expect(s.source).toBe('transito');
    const area = s.targets.find(t => t.key === 'area');
    expect(area).toBeDefined();
    expect(area!.fields).toEqual(['areaFixed']);
    expect(area!.toState).toBe('processing');

    const reroute = s.targets.find(t => t.key === 'reroute');
    expect(reroute!.fields).toEqual(['sucursal', 'area']);

    const derived = s.targets.find(t => t.key === 'derived');
    expect(derived!.fields).toEqual(['lab']);

    const rollback = s.targets.find(t => t.key === 'rollback');
    expect(rollback!.toState).toBe('collected');
  });

  it('Procesamiento lista source=processing y rollback vuelve a transito', () => {
    const s = SCREENS.procesamiento;
    expect(s.source).toBe('processing');
    const rb = s.targets.find(t => t.key === 'rollback');
    expect(rb!.toState).toBe('transito');
    const completed = s.targets.find(t => t.key === 'completed');
    expect(completed!.reco).toBeUndefined();
  });

  it('Descarte lista source=completed y discard va a discarded', () => {
    const s = SCREENS.descarte;
    expect(s.source).toBe('completed');
    const d = s.targets.find(t => t.key === 'discard');
    expect(d!.toState).toBe('discarded');
    expect(d!.reco).toBe('DESCARTE');
    const rb = s.targets.find(t => t.key === 'rollback');
    expect(rb!.toState).toBe('processing');
  });

  it('todas las transiciones tienen icon, label, desc y color válidos', () => {
    const valid = new Set(['green','red','amber','blue','purple','slate']);
    for (const screen of Object.values(SCREENS)) {
      for (const t of screen.targets) {
        expect(t.icon.length).toBeGreaterThan(0);
        expect(t.label.length).toBeGreaterThan(0);
        expect(t.desc.length).toBeGreaterThan(0);
        expect(valid.has(t.color)).toBe(true);
      }
    }
  });
});

describe('state-machine.config — screen traslado', () => {
  it('expone rejected, lost y rollback', () => {
    const keys = SCREENS.traslado.targets.map((t) => t.key);
    expect(keys).toContain('rejected');
    expect(keys).toContain('lost');
    expect(keys).toContain('rollback');
  });

  it('rejected/lost apuntan a los estados correctos', () => {
    const byKey = new Map(SCREENS.traslado.targets.map((t) => [t.key, t]));
    expect(byKey.get('rejected')!.toState).toBe('rejected');
    expect(byKey.get('lost')!.toState).toBe('lost');
  });
});
