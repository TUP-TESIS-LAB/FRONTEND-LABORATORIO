import { HttpErrorResponse } from '@angular/common/http';
import type { DetalleEstudio } from '../../models/postanalitica.model';
export interface ValidacionDetalleState { detalle: DetalleEstudio | null; loading: boolean; saving: boolean; pdfLoading: boolean; error: HttpErrorResponse | null; }
export const initialValidacionDetalleState: ValidacionDetalleState = { detalle: null, loading: false, saving: false, pdfLoading: false, error: null };
export const VALIDACION_DETALLE_FEATURE_KEY = 'validacionDetalle';
