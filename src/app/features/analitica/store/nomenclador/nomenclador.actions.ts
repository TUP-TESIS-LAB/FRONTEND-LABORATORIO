import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { CatalogRow, NbuVersion, ParticularPricing } from '../../models/nomenclador.model';

// ── Versiones ────────────────────────────────────────────────────────────────
export const cargarVersiones = createAction('[Nomenclador Page] Cargar versiones');
export const cargarVersionesSuccess = createAction(
  '[Nomenclador API] Cargar versiones success',
  props<{ versiones: NbuVersion[] }>(),
);
export const cargarVersionesFailure = createAction(
  '[Nomenclador API] Cargar versiones failure',
  props<{ error: HttpErrorResponse }>(),
);

export const seleccionarVersion = createAction(
  '[Nomenclador Page] Seleccionar version',
  props<{ versionId: string }>(),
);

// ── Catálogo ─────────────────────────────────────────────────────────────────
export const cargarCatalog = createAction('[Nomenclador Page] Cargar catalog');
export const cargarCatalogSuccess = createAction(
  '[Nomenclador API] Cargar catalog success',
  props<{ catalog: CatalogRow[] }>(),
);
export const cargarCatalogFailure = createAction(
  '[Nomenclador API] Cargar catalog failure',
  props<{ error: HttpErrorResponse }>(),
);

// ── Pricing particular ───────────────────────────────────────────────────────
export const cargarPricing = createAction('[Nomenclador Page] Cargar pricing');
export const cargarPricingSuccess = createAction(
  '[Nomenclador API] Cargar pricing success',
  props<{ pricing: ParticularPricing }>(),
);
export const cargarPricingFailure = createAction(
  '[Nomenclador API] Cargar pricing failure',
  props<{ error: HttpErrorResponse }>(),
);

export const guardarValorUb = createAction(
  '[Nomenclador Page] Guardar valorUb',
  props<{ valor: number }>(),
);
export const guardarValorUbSuccess = createAction(
  '[Nomenclador API] Guardar valorUb success',
  props<{ valor: number }>(),
);
export const guardarValorUbFailure = createAction(
  '[Nomenclador API] Guardar valorUb failure',
  props<{ error: HttpErrorResponse }>(),
);

export const setOverride = createAction(
  '[Nomenclador Page] Set override',
  props<{ analysisId: number; precio: number | null }>(),
);
export const setOverrideSuccess = createAction(
  '[Nomenclador API] Set override success',
  props<{ analysisId: number; precio: number | null }>(),
);
export const setOverrideFailure = createAction(
  '[Nomenclador API] Set override failure',
  props<{ error: HttpErrorResponse }>(),
);
