import { CatalogRow, Determination, NbuVersion, ParticularPricing } from '../models/nomenclador.model';
import {
  NOMENCLADOR_FEATURE_KEY,
  NomencladorFeatureState,
  initialNomencladorState,
} from './nomenclador/nomenclador.state';
import {
  selectNbuVersions,
  selectSelectedVersionId,
  selectValorUb,
  selectNomencladorPending,
  selectCatalogRows,
  selectParticularRows,
  selectDeterminations,
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

function determination(over: Partial<Determination> = {}): Determination {
  return { id: 1, name: 'Glóbulos rojos', ...over };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('nomenclador selectors', () => {

  // ── selectNbuVersions ─────────────────────────────────────────────────────
  describe('selectNbuVersions', () => {
    it('devuelve el array de versiones NBU del slice', () => {
      const nbuVersions = [version(), version({ id: 'v2021', vigente: false })];
      expect(selectNbuVersions(stateWith({ nbuVersions }))).toEqual(nbuVersions);
    });

    it('devuelve [] en estado inicial', () => {
      expect(selectNbuVersions(stateWith({}))).toEqual([]);
    });
  });

  // ── selectSelectedVersionId ───────────────────────────────────────────────
  describe('selectSelectedVersionId', () => {
    it('devuelve el id de la versión seleccionada', () => {
      expect(selectSelectedVersionId(stateWith({ selectedVersionId: 'v2021' }))).toBe('v2021');
    });

    it('devuelve null en estado inicial', () => {
      expect(selectSelectedVersionId(stateWith({}))).toBeNull();
    });
  });

  // ── selectValorUb ─────────────────────────────────────────────────────────
  describe('selectValorUb', () => {
    it('devuelve el valorUb del particular', () => {
      expect(selectValorUb(stateWith({ particular: pricing({ valorUb: 500 }) }))).toBe(500);
    });

    it('devuelve 0 en estado inicial', () => {
      expect(selectValorUb(stateWith({}))).toBe(0);
    });
  });

  // ── selectNomencladorPending ──────────────────────────────────────────────
  describe('selectNomencladorPending', () => {
    it('refleja el flag pending', () => {
      expect(selectNomencladorPending(stateWith({ pending: true }))).toBe(true);
      expect(selectNomencladorPending(stateWith({ pending: false }))).toBe(false);
    });
  });

  // ── selectCatalogRows ─────────────────────────────────────────────────────
  describe('selectCatalogRows', () => {
    it('devuelve filas con cantidadUb sin ajuste (v2024 factor=1)', () => {
      const catalog = [row({ id: 1, cantidadUb: 10 })];
      const rows = selectCatalogRows(stateWith({ catalog, selectedVersionId: 'v2024' }));
      expect(rows[0].cantidadUb).toBe(10);
    });

    it('cambiar de versión recalcula cantidadUb (v2021 factor=0.85)', () => {
      const catalog = [row({ id: 1, cantidadUb: 10 })];
      const rows = selectCatalogRows(stateWith({ catalog, selectedVersionId: 'v2021' }));
      expect(rows[0].cantidadUb).toBe(8.5); // 10 * 0.85
    });

    it('devuelve cantidadUb=null cuando la base es null', () => {
      const catalog = [row({ id: 1, cantidadUb: null })];
      const rows = selectCatalogRows(stateWith({ catalog, selectedVersionId: 'v2024' }));
      expect(rows[0].cantidadUb).toBeNull();
    });

    it('usa factor 1 (v2024) cuando selectedVersionId es null', () => {
      const catalog = [row({ id: 1, cantidadUb: 10 })];
      const rows = selectCatalogRows(stateWith({ catalog, selectedVersionId: null }));
      expect(rows[0].cantidadUb).toBe(10);
    });

    it('devuelve [] en estado inicial', () => {
      expect(selectCatalogRows(stateWith({}))).toEqual([]);
    });
  });

  // ── selectParticularRows (colección) ──────────────────────────────────────
  describe('selectParticularRows', () => {
    it('precio = cantidadUb(versión) × valorUb cuando no hay override', () => {
      const catalog = [row({ id: 1, cantidadUb: 10 })];
      const particular = pricing({ valorUb: 350, overrides: {} });
      const rows = selectParticularRows(stateWith({ catalog, particular, selectedVersionId: 'v2024' }));
      expect(rows[0].cantidadUb).toBe(10);   // v2024 factor=1
      expect(rows[0].auto).toBe(3500);        // 10 × 350
      expect(rows[0].precio).toBe(3500);
      expect(rows[0].esManual).toBe(false);
    });

    it('override pisa la fórmula y marca esManual=true', () => {
      const catalog = [row({ id: 1, cantidadUb: 10 })];
      const particular = pricing({ valorUb: 350, overrides: { 1: 9999 } });
      const rows = selectParticularRows(stateWith({ catalog, particular, selectedVersionId: 'v2024' }));
      expect(rows[0].precio).toBe(9999);
      expect(rows[0].esManual).toBe(true);
      expect(rows[0].auto).toBe(3500); // auto se sigue calculando
    });

    it('auto=null cuando cantidadUb es null y no hay override', () => {
      const catalog = [row({ id: 1, cantidadUb: null })];
      const particular = pricing({ valorUb: 350, overrides: {} });
      const rows = selectParticularRows(stateWith({ catalog, particular, selectedVersionId: 'v2024' }));
      expect(rows[0].auto).toBeNull();
      expect(rows[0].precio).toBeNull();
      expect(rows[0].esManual).toBe(false);
    });

    it('override puede sobrepasar null-auto (cantidadUb null con override)', () => {
      const catalog = [row({ id: 1, cantidadUb: null })];
      const particular = pricing({ valorUb: 350, overrides: { 1: 500 } });
      const rows = selectParticularRows(stateWith({ catalog, particular, selectedVersionId: 'v2024' }));
      expect(rows[0].precio).toBe(500);
      expect(rows[0].esManual).toBe(true);
    });

    it('aplica factor de versión v2021=0.85 en el precio automático', () => {
      const catalog = [row({ id: 1, cantidadUb: 10 })];
      const particular = pricing({ valorUb: 350, overrides: {} });
      const rows = selectParticularRows(stateWith({ catalog, particular, selectedVersionId: 'v2021' }));
      expect(rows[0].cantidadUb).toBe(8.5);
      expect(rows[0].auto).toBe(2975); // 8.5 × 350
      expect(rows[0].precio).toBe(2975);
    });

    it('devuelve múltiples filas con sus propios overrides', () => {
      const catalog = [
        row({ id: 1, cantidadUb: 10, shortCode: 'HEMO' }),
        row({ id: 2, cantidadUb: 5, shortCode: 'GLUC' }),
      ];
      const particular = pricing({ valorUb: 200, overrides: { 2: 999 } });
      const rows = selectParticularRows(stateWith({ catalog, particular, selectedVersionId: 'v2024' }));
      expect(rows[0].precio).toBe(2000);  // 10 × 200, sin override
      expect(rows[0].esManual).toBe(false);
      expect(rows[1].precio).toBe(999);   // override
      expect(rows[1].esManual).toBe(true);
    });

    it('devuelve [] cuando el catálogo está vacío', () => {
      expect(selectParticularRows(stateWith({}))).toEqual([]);
    });
  });

  // ── selectDeterminations (factory) ───────────────────────────────────────
  describe('selectDeterminations', () => {
    it('devuelve null cuando el analysisId no fue cargado aún', () => {
      const result = selectDeterminations(1)(stateWith({ determinationsByAnalysis: {} }));
      expect(result).toBeNull();
    });

    it('devuelve el array de determinaciones cuando está cargado', () => {
      const dets = [determination({ id: 1 }), determination({ id: 2, name: 'Leucocitos' })];
      const result = selectDeterminations(1)(stateWith({ determinationsByAnalysis: { 1: dets } }));
      expect(result).toEqual(dets);
    });

    it('devuelve [] (no null) cuando fue cargado sin determinaciones', () => {
      const result = selectDeterminations(1)(stateWith({ determinationsByAnalysis: { 1: [] } }));
      expect(result).toEqual([]);
    });

    it('no mezcla determinaciones de distintos analysisId', () => {
      const dets1 = [determination({ id: 10, name: 'Det A' })];
      const dets2 = [determination({ id: 20, name: 'Det B' })];
      const state = stateWith({ determinationsByAnalysis: { 1: dets1, 2: dets2 } });
      expect(selectDeterminations(1)(state)).toEqual(dets1);
      expect(selectDeterminations(2)(state)).toEqual(dets2);
    });
  });

  // ── selectPrecioParticular (factory, por-id) ──────────────────────────────
  describe('selectPrecioParticular', () => {
    it('devuelve null cuando no hay análisis en el catálogo', () => {
      const state = stateWith({
        catalog: [],
        particular: pricing({ valorUb: 350 }),
        selectedVersionId: 'v2024',
      });
      expect(selectPrecioParticular(1)(state)).toBeNull();
    });

    it('usa override cuando existe para el analysisId', () => {
      const p = pricing({ valorUb: 350, overrides: { 1: 999 } });
      const result = selectPrecioParticular(1)(
        stateWith({ particular: p, selectedVersionId: 'v2024', catalog: [row({ id: 1, cantidadUb: 10 })] }),
      );
      expect(result).toBe(999);
    });

    it('calcula precio = cantidadUb(version) × valorUb cuando no hay override', () => {
      // v2024 factor=1: 10 × 350 = 3500
      const p = pricing({ valorUb: 350, overrides: {} });
      const result = selectPrecioParticular(1)(
        stateWith({ particular: p, selectedVersionId: 'v2024', catalog: [row({ id: 1, cantidadUb: 10 })] }),
      );
      expect(result).toBe(3500);
    });

    it('aplica factor de versión correctamente (v2021 = 0.85)', () => {
      // v2021 factor=0.85: 10 * 0.85 = 8.5 UB × 350 = 2975
      const p = pricing({ valorUb: 350, overrides: {} });
      const result = selectPrecioParticular(1)(
        stateWith({ particular: p, selectedVersionId: 'v2021', catalog: [row({ id: 1, cantidadUb: 10 })] }),
      );
      expect(result).toBe(2975);
    });

    it('devuelve null cuando cantidadUb es null y no hay override', () => {
      const p = pricing({ valorUb: 350, overrides: {} });
      const result = selectPrecioParticular(1)(
        stateWith({ particular: p, selectedVersionId: 'v2024', catalog: [row({ id: 1, cantidadUb: null })] }),
      );
      expect(result).toBeNull();
    });

    it('devuelve null cuando versionActiva es null', () => {
      const p = pricing({ valorUb: 350, overrides: {} });
      const result = selectPrecioParticular(1)(
        stateWith({ particular: p, selectedVersionId: null, catalog: [row({ id: 1, cantidadUb: 10 })] }),
      );
      expect(result).toBeNull();
    });
  });
});
