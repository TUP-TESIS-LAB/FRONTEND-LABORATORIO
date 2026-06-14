import { HttpErrorResponse } from '@angular/common/http';
import type { ValidationView } from '../../models/postanalitica.model';

export interface PostanaliticaState { view: ValidationView | null; loading: boolean; saving: boolean; error: HttpErrorResponse | null; }
export const initialPostanaliticaState: PostanaliticaState = { view: null, loading: false, saving: false, error: null };
export const POSTANALITICA_FEATURE_KEY = 'postanalitica';
