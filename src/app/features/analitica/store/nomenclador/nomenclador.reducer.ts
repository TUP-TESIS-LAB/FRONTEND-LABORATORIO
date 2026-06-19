import { createReducer, on } from '@ngrx/store';
import { initialNomencladorState, NomencladorFeatureState } from './nomenclador.state';
import {
  cargarCatalog, cargarCatalogFailure, cargarCatalogSuccess,
  cargarPricing, cargarPricingFailure, cargarPricingSuccess,
  cargarVersiones, cargarVersionesFailure, cargarVersionesSuccess,
  guardarValorUbSuccess,
  seleccionarVersion,
  setOverrideSuccess,
} from './nomenclador.actions';

export const nomencladorReducer = createReducer(
  initialNomencladorState,

  // ── Versiones ──────────────────────────────────────────────────────────────
  on(cargarVersiones, (state): NomencladorFeatureState => ({
    ...state, versionesLoading: true, versionesError: null,
  })),
  on(cargarVersionesSuccess, (state, { versiones }): NomencladorFeatureState => ({
    ...state,
    versiones,
    versionesLoading: false,
    versionActiva: state.versionActiva ?? (versiones.find(v => v.vigente)?.id ?? versiones[0]?.id ?? null),
  })),
  on(cargarVersionesFailure, (state, { error }): NomencladorFeatureState => ({
    ...state, versionesLoading: false, versionesError: error,
  })),

  on(seleccionarVersion, (state, { versionId }): NomencladorFeatureState => ({
    ...state, versionActiva: versionId,
  })),

  // ── Catálogo ───────────────────────────────────────────────────────────────
  on(cargarCatalog, (state): NomencladorFeatureState => ({
    ...state, catalogLoading: true, catalogError: null,
  })),
  on(cargarCatalogSuccess, (state, { catalog }): NomencladorFeatureState => ({
    ...state, catalog, catalogLoading: false,
  })),
  on(cargarCatalogFailure, (state, { error }): NomencladorFeatureState => ({
    ...state, catalogLoading: false, catalogError: error,
  })),

  // ── Pricing ────────────────────────────────────────────────────────────────
  on(cargarPricing, (state): NomencladorFeatureState => ({
    ...state, pricingLoading: true, pricingError: null,
  })),
  on(cargarPricingSuccess, (state, { pricing }): NomencladorFeatureState => ({
    ...state, pricing, pricingLoading: false,
  })),
  on(cargarPricingFailure, (state, { error }): NomencladorFeatureState => ({
    ...state, pricingLoading: false, pricingError: error,
  })),

  on(guardarValorUbSuccess, (state, { valor }): NomencladorFeatureState => ({
    ...state,
    pricing: state.pricing ? { ...state.pricing, valorUb: valor } : null,
  })),

  on(setOverrideSuccess, (state, { analysisId, precio }): NomencladorFeatureState => {
    if (!state.pricing) return state;
    const overrides = { ...state.pricing.overrides };
    if (precio == null) {
      delete overrides[analysisId];
    } else {
      overrides[analysisId] = precio;
    }
    return { ...state, pricing: { ...state.pricing, overrides } };
  }),
);
