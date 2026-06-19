import { HttpErrorResponse } from '@angular/common/http';
import { CatalogRow, NbuVersion, ParticularPricing } from '../../models/nomenclador.model';

export interface NomencladorFeatureState {
  versiones: NbuVersion[];
  versionesLoading: boolean;
  versionesError: HttpErrorResponse | null;
  /** Id de la versión NBU seleccionada actualmente. */
  versionActiva: string | null;
  catalog: CatalogRow[];
  catalogLoading: boolean;
  catalogError: HttpErrorResponse | null;
  pricing: ParticularPricing | null;
  pricingLoading: boolean;
  pricingError: HttpErrorResponse | null;
}

export const initialNomencladorState: NomencladorFeatureState = {
  versiones: [],
  versionesLoading: false,
  versionesError: null,
  versionActiva: null,
  catalog: [],
  catalogLoading: false,
  catalogError: null,
  pricing: null,
  pricingLoading: false,
  pricingError: null,
};

export const NOMENCLADOR_FEATURE_KEY = 'nomenclador';
