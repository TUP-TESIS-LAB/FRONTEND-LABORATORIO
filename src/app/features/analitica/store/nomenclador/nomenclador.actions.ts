import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { CatalogRow, Determination, NbuVersion, ParticularPricing } from '../../models/nomenclador.model';

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
