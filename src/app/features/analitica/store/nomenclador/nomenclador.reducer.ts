import { createReducer, on } from '@ngrx/store';
import { initialNomencladorState, NomencladorFeatureState } from './nomenclador.state';
import {
  loadNomenclador,
  loadNomencladorFailure,
  loadNomencladorSuccess,
  loadDeterminationsSuccess,
  loadConfigResumenSuccess,
  saveValorUbSuccess,
  selectNbuVersion,
  setOverrideSuccess,
} from './nomenclador.actions';

export const nomencladorReducer = createReducer(
  initialNomencladorState,

  // ── Carga inicial ──────────────────────────────────────────────────────────
  on(loadNomenclador, (state): NomencladorFeatureState => ({
    ...state, pending: true, error: null,
  })),
  on(loadNomencladorSuccess, (state, { versions, catalog, pricing }): NomencladorFeatureState => ({
    ...state,
    pending: false,
    error: null,
    nbuVersions: versions,
    catalog,
    particular: pricing,
    // Mantener la versión seleccionada si ya hay una; si no, tomar la vigente.
    selectedVersionId: state.selectedVersionId
      ?? (versions.find(v => v.vigente)?.id ?? versions[0]?.id ?? null),
  })),
  on(loadNomencladorFailure, (state, { error }): NomencladorFeatureState => ({
    ...state, pending: false, error,
  })),

  // ── Versión seleccionada ───────────────────────────────────────────────────
  on(selectNbuVersion, (state, { versionId }): NomencladorFeatureState => ({
    ...state, selectedVersionId: versionId,
  })),

  // ── Determinaciones ────────────────────────────────────────────────────────
  on(loadDeterminationsSuccess, (state, { analysisId, nbuCode, determinations }): NomencladorFeatureState => ({
    ...state,
    determinationsByAnalysis: { ...state.determinationsByAnalysis, [analysisId]: determinations },
    // Parchear el nbuCode en la fila del catálogo correspondiente (viene del detalle al expandir)
    catalog: state.catalog.map(row =>
      row.id === analysisId ? { ...row, nbuCode } : row,
    ),
  })),

  // ── Resumen de config ──────────────────────────────────────────────────────
  on(loadConfigResumenSuccess, (state, { analysisId, resumen }): NomencladorFeatureState => ({
    ...state,
    configByAnalysis: { ...state.configByAnalysis, [analysisId]: resumen },
  })),

  // ── Valor U.B. ─────────────────────────────────────────────────────────────
  on(saveValorUbSuccess, (state, { valor }): NomencladorFeatureState => ({
    ...state,
    particular: { ...state.particular, valorUb: valor },
  })),

  // ── Override manual ────────────────────────────────────────────────────────
  on(setOverrideSuccess, (state, { analysisId, precio }): NomencladorFeatureState => {
    const overrides = { ...state.particular.overrides };
    if (precio == null) {
      delete overrides[analysisId];
    } else {
      overrides[analysisId] = precio;
    }
    return { ...state, particular: { ...state.particular, overrides } };
  }),
);
