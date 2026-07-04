import { HttpErrorResponse } from '@angular/common/http';
import { CatalogRow, ConfigResumen, Determination, NbuVersion, ParticularPricing } from '../../models/nomenclador.model';

export interface NomencladorFeatureState {
  /** Versiones NBU disponibles. */
  nbuVersions: NbuVersion[];
  /** Id de la versión NBU seleccionada actualmente. */
  selectedVersionId: string | null;
  /** Catálogo de análisis. */
  catalog: CatalogRow[];
  /** Configuración de precio particular (valorUb + overrides manuales). */
  particular: ParticularPricing;
  /** Determinaciones por análisisId (lazy: se carga al expandir la fila del tab Catálogo). */
  determinationsByAnalysis: Record<number, Determination[]>;
  /** Resumen de config por análisisId (lazy: se carga al expandir la fila del tab Catálogo). */
  configByAnalysis: Record<number, ConfigResumen>;
  /** true mientras la carga inicial (loadNomenclador) está en curso. */
  pending: boolean;
  /** Error de la carga inicial, si la hubo. */
  error: HttpErrorResponse | null;
}

export const initialNomencladorState: NomencladorFeatureState = {
  nbuVersions: [],
  selectedVersionId: null,
  catalog: [],
  particular: { valorUb: 0, overrides: {} },
  determinationsByAnalysis: {},
  configByAnalysis: {},
  pending: false,
  error: null,
};

export const NOMENCLADOR_FEATURE_KEY = 'nomenclador';
