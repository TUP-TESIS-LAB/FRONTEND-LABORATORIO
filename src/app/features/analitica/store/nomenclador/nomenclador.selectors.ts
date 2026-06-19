import { createFeatureSelector, createSelector } from '@ngrx/store';
import { cantidadUbParaVersion } from '../../models/nomenclador.model';
import { NOMENCLADOR_FEATURE_KEY, NomencladorFeatureState } from './nomenclador.state';

export const selectNomencladorState =
  createFeatureSelector<NomencladorFeatureState>(NOMENCLADOR_FEATURE_KEY);

// ── Slices básicos ────────────────────────────────────────────────────────────
export const selectVersiones      = createSelector(selectNomencladorState, s => s.versiones);
export const selectVersionActiva  = createSelector(selectNomencladorState, s => s.versionActiva);
export const selectCatalog        = createSelector(selectNomencladorState, s => s.catalog);
export const selectCatalogLoading = createSelector(selectNomencladorState, s => s.catalogLoading);
export const selectPricing        = createSelector(selectNomencladorState, s => s.pricing);
export const selectPricingLoading = createSelector(selectNomencladorState, s => s.pricingLoading);

/**
 * Selector derivado: precio particular de un análisis en la versión activa.
 *
 * Lógica (en orden):
 *  1. Si no hay pricing cargado → null.
 *  2. Si hay override manual para el analysisId → devuelve el override.
 *  3. Busca el análisis en el catálogo; si no aparece → null.
 *  4. Si cantidadUb es null o versionActiva es null → null.
 *  5. precio = cantidadUbParaVersion(cantidadUb, versionActiva) * valorUb.
 *
 * Factory (función que devuelve selector) para parametrizar por analysisId.
 */
export function selectPrecioParticular(analysisId: number) {
  return createSelector(
    selectPricing,
    selectVersionActiva,
    selectCatalog,
    (pricing, versionActiva, catalog): number | null => {
      if (!pricing) return null;

      // Override manual tiene prioridad
      if (analysisId in pricing.overrides) {
        return pricing.overrides[analysisId];
      }

      if (!versionActiva) return null;

      const fila = catalog.find(r => r.id === analysisId);
      if (!fila) return null;

      const ub = cantidadUbParaVersion(fila.cantidadUb, versionActiva);
      if (ub == null) return null;

      return Math.round(ub * pricing.valorUb * 100) / 100;
    },
  );
}
