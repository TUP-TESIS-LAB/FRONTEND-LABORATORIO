import { HttpErrorResponse } from '@angular/common/http';
import type { ResultGrid } from '../../models/resultado.model';

export interface ResultadosState { grid: ResultGrid | null; loading: boolean; saving: boolean; error: HttpErrorResponse | null; }
export const initialResultadosState: ResultadosState = { grid: null, loading: false, saving: false, error: null };
export const RESULTADOS_FEATURE_KEY = 'resultados';
