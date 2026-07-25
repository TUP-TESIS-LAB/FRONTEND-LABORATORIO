import { HttpErrorResponse } from '@angular/common/http';
import { SectionListItem } from '../../models/section-list-item.model';

export interface SeccionesState {
  secciones: SectionListItem[];
  /** sectionId → cantidad de análisis (mergeado por `selectSeccionesConCount`). */
  countMap: Record<number, number>;
  /** Análisis del tenant sin sección asignada. */
  unassignedCount: number;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialSeccionesState: SeccionesState = {
  secciones: [],
  countMap: {},
  unassignedCount: 0,
  pending: false,
  error: null,
};

export const SECCIONES_FEATURE_KEY = 'empresaSecciones';
