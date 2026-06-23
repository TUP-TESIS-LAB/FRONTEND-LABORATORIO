import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { CatalogRow, ConfigResumen, Determination, NbuVersion, ParticularPricing } from '../../models/nomenclador.model';

// ── Carga inicial (forkJoin de versiones + catálogo + pricing) ────────────────
export const loadNomenclador = createAction('[Nomenclador] Load');
export const loadNomencladorSuccess = createAction(
  '[Nomenclador API] Load Success',
  props<{ versions: NbuVersion[]; catalog: CatalogRow[]; pricing: ParticularPricing }>(),
);
export const loadNomencladorFailure = createAction(
  '[Nomenclador API] Load Failure',
  props<{ error: HttpErrorResponse }>(),
);

// ── Versión seleccionada ──────────────────────────────────────────────────────
export const selectNbuVersion = createAction(
  '[Nomenclador] Select Version',
  props<{ versionId: string }>(),
);

// ── Determinaciones (lazy por análisisId) ────────────────────────────────────
export const loadDeterminations = createAction(
  '[Nomenclador] Load Determinations',
  props<{ analysisId: number }>(),
);
export const loadDeterminationsSuccess = createAction(
  '[Nomenclador API] Load Determinations Success',
  props<{ analysisId: number; nbuCode: string | null; determinations: Determination[] }>(),
);

// ── Resumen de config por análisis (lazy por análisisId) ─────────────────────
export const loadConfigResumen = createAction(
  '[Nomenclador] Load Config Resumen',
  props<{ analysisId: number }>(),
);
export const loadConfigResumenSuccess = createAction(
  '[Nomenclador API] Load Config Resumen Success',
  props<{ analysisId: number; resumen: ConfigResumen }>(),
);
export const loadConfigResumenFailure = createAction(
  '[Nomenclador API] Load Config Resumen Failure',
  props<{ analysisId: number }>(),
);

// ── Valor U.B. particular ────────────────────────────────────────────────────
export const saveValorUb = createAction(
  '[Nomenclador] Save Valor UB',
  props<{ valor: number }>(),
);
export const saveValorUbSuccess = createAction(
  '[Nomenclador API] Save Valor UB Success',
  props<{ valor: number }>(),
);

// ── Override manual de precio por análisis ───────────────────────────────────
export const setOverride = createAction(
  '[Nomenclador] Set Override',
  props<{ analysisId: number; precio: number | null }>(),
);
export const setOverrideSuccess = createAction(
  '[Nomenclador API] Set Override Success',
  props<{ analysisId: number; precio: number | null }>(),
);
