import { describe, expect, it } from 'vitest';
import { SCREENS, rowActionsFor } from './state-machine.config';
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

describe('rowActionsFor — menú kebab derivado de la config', () => {
  it('Recolección: {Rechazar, Perder}, sin rollback (estado inicial)', () => {
    const actions = rowActionsFor('recoleccion');
    expect(actions.map((a) => a.key)).toEqual(['rejected', 'lost']);
    expect(actions.map((a) => a.label)).toEqual(['Rechazar', 'Perder']);
  });

  it('Procesamiento: {Rollback, Rechazar, Perder} — sin Derivar', () => {
    const actions = rowActionsFor('procesamiento');
    expect(actions.map((a) => a.key).sort()).toEqual(['lost', 'rejected', 'rollback']);
    expect(actions.map((a) => a.key)).not.toContain('derived');
  });

  it('Traslado: {Derivar, Rollback, Rechazar, Perder}', () => {
    const actions = rowActionsFor('traslado');
    expect(actions.map((a) => a.key).sort()).toEqual(['derived', 'lost', 'rejected', 'rollback']);
  });

  it('Traslado: incluye acción derived con label "Derivar" (KAN-226)', () => {
    const derived = rowActionsFor('traslado').find((a) => a.key === 'derived');
    expect(derived).toBeDefined();
    expect(derived!.label).toBe('Derivar');
  });

  it('Descarte: incluye acción reinjectRequest "Pedir de nuevo" (KAN-239)', () => {
    // La re-inyección agrega el kebab "Pedir de nuevo" a Descarte (para las labels REJECTED/LOST).
    expect(rowActionsFor('descarte').map((a) => a.key)).toEqual(['reinjectRequest']);
  });

  it('cada acción del menú corresponde a un target resoluble por onRowAction (anti-desincronización)', () => {
    for (const screen of ['recoleccion', 'procesamiento', 'traslado', 'descarte'] as const) {
      const targetKeys = new Set(SCREENS[screen].targets.map((t) => t.key));
      for (const a of rowActionsFor(screen)) {
        expect(targetKeys.has(a.key)).toBe(true);
      }
    }
  });

  it('el icon del menú cae al icon del target cuando rowMenu no lo especifica', () => {
    const rejected = rowActionsFor('recoleccion').find((a) => a.key === 'rejected')!;
    expect(rejected.icon).toBe('pi-ban');
  });
});
