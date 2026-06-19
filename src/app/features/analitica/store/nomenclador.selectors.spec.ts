import { CatalogRow, NbuVersion, ParticularPricing } from '../models/nomenclador.model';
import {
  NOMENCLADOR_FEATURE_KEY,
  NomencladorFeatureState,
  initialNomencladorState,
} from './nomenclador/nomenclador.state';
import {
  selectVersiones,
  selectVersionActiva,
  selectCatalog,
  selectCatalogLoading,
  selectPricing,
  selectPricingLoading,
  selectPrecioParticular,
} from './nomenclador/nomenclador.selectors';

// ── helpers ──────────────────────────────────────────────────────────────────

function stateWith(
  patch: Partial<NomencladorFeatureState>,
): { [NOMENCLADOR_FEATURE_KEY]: NomencladorFeatureState } {
  return { [NOMENCLADOR_FEATURE_KEY]: { ...initialNomencladorState, ...patch } };
}

function version(over: Partial<NbuVersion> = {}): NbuVersion {
  return { id: 'v2024', label: 'NBU 2024', vigente: true, ...over };
}

function row(over: Partial<CatalogRow> = {}): CatalogRow {
  return {
    id: 1,
    shortCode: 'HEMO',
    name: 'Hemograma',
    familyName: 'Hematología',
    nbuCode: null,
    cantidadUb: 10,
    ...over,
  };
}

function pricing(over: Partial<ParticularPricing> = {}): ParticularPricing {
  return { valorUb: 350, overrides: {}, ...over };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('nomenclador selectors', () => {
  // ── selectVersiones ──────────────────────────────────────────────────────
  describe('selectVersiones', () => {
    it('devuelve el array de versiones del slice', () => {
      const versiones = [version(), version({ id: 'v2021', vigente: false })];
      expect(selectVersiones(stateWith({ versiones }))).toEqual(versiones);
    });

    it('devuelve [] en estado inicial', () => {
      expect(selectVersiones(stateWith({}))).toEqual([]);
    });
  });

  // ── selectVersionActiva ──────────────────────────────────────────────────
  describe('selectVersionActiva', () => {
    it('devuelve el id de la versión seleccionada', () => {
      expect(selectVersionActiva(stateWith({ versionActiva: 'v2021' }))).toBe('v2021');
    });

    it('devuelve null en estado inicial', () => {
      expect(selectVersionActiva(stateWith({}))).toBeNull();
    });
  });

  // ── selectCatalog ────────────────────────────────────────────────────────
  describe('selectCatalog', () => {
    it('devuelve las filas del catálogo', () => {
      const catalog = [row(), row({ id: 2, shortCode: 'GLUC' })];
      expect(selectCatalog(stateWith({ catalog }))).toEqual(catalog);
    });

    it('devuelve [] en estado inicial', () => {
      expect(selectCatalog(stateWith({}))).toEqual([]);
    });
  });

  // ── selectCatalogLoading ─────────────────────────────────────────────────
  describe('selectCatalogLoading', () => {
    it('refleja catalogLoading', () => {
      expect(selectCatalogLoading(stateWith({ catalogLoading: true }))).toBe(true);
      expect(selectCatalogLoading(stateWith({ catalogLoading: false }))).toBe(false);
    });
  });

  // ── selectPricing ────────────────────────────────────────────────────────
  describe('selectPricing', () => {
    it('devuelve el pricing del slice', () => {
      const p = pricing({ valorUb: 500 });
      expect(selectPricing(stateWith({ pricing: p }))).toEqual(p);
    });

    it('devuelve null en estado inicial', () => {
      expect(selectPricing(stateWith({}))).toBeNull();
    });
  });

  // ── selectPricingLoading ─────────────────────────────────────────────────
  describe('selectPricingLoading', () => {
    it('refleja pricingLoading', () => {
      expect(selectPricingLoading(stateWith({ pricingLoading: true }))).toBe(true);
    });
  });

  // ── selectPrecioParticular (selector derivado) ───────────────────────────
  describe('selectPrecioParticular', () => {
    it('devuelve null cuando no hay pricing', () => {
      expect(
        selectPrecioParticular(1)(stateWith({ pricing: null, versionActiva: 'v2024' })),
      ).toBeNull();
    });

    it('usa override cuando existe para el analysisId', () => {
      const p = pricing({ valorUb: 350, overrides: { 1: 999 } });
      const result = selectPrecioParticular(1)(
        stateWith({ pricing: p, versionActiva: 'v2024', catalog: [row({ id: 1, cantidadUb: 10 })] }),
      );
      expect(result).toBe(999);
    });

    it('calcula precio = cantidadUb(version) * valorUb cuando no hay override', () => {
      // v2024 factor=1: 10 * 350 = 3500
      const p = pricing({ valorUb: 350, overrides: {} });
      const result = selectPrecioParticular(1)(
        stateWith({ pricing: p, versionActiva: 'v2024', catalog: [row({ id: 1, cantidadUb: 10 })] }),
      );
      expect(result).toBe(3500);
    });

    it('aplica factor de versión correctamente (v2021 = 0.85)', () => {
      // v2021 factor=0.85: 10 * 0.85 = 8.5 UB * 350 = 2975
      const p = pricing({ valorUb: 350, overrides: {} });
      const result = selectPrecioParticular(1)(
        stateWith({ pricing: p, versionActiva: 'v2021', catalog: [row({ id: 1, cantidadUb: 10 })] }),
      );
      expect(result).toBe(2975);
    });

    it('devuelve null cuando cantidadUb es null y no hay override', () => {
      const p = pricing({ valorUb: 350, overrides: {} });
      const result = selectPrecioParticular(1)(
        stateWith({ pricing: p, versionActiva: 'v2024', catalog: [row({ id: 1, cantidadUb: null })] }),
      );
      expect(result).toBeNull();
    });

    it('devuelve null cuando el análisis no está en el catálogo', () => {
      const p = pricing({ valorUb: 350, overrides: {} });
      const result = selectPrecioParticular(999)(
        stateWith({ pricing: p, versionActiva: 'v2024', catalog: [row({ id: 1 })] }),
      );
      expect(result).toBeNull();
    });

    it('devuelve null cuando versionActiva es null', () => {
      const p = pricing({ valorUb: 350, overrides: {} });
      const result = selectPrecioParticular(1)(
        stateWith({ pricing: p, versionActiva: null, catalog: [row({ id: 1, cantidadUb: 10 })] }),
      );
      expect(result).toBeNull();
    });
  });
});
