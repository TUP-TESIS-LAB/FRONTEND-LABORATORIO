import { ExternalLab, ExternalLabState } from '../../models/external-lab.model';

export const DERIVACIONES_FEATURE_KEY = 'empresaDerivaciones';

export interface DerivacionesState {
  labs: ExternalLab[];
  /** Segmento seleccionado: activados / desactivados / todos. */
  state: ExternalLabState;
  pending: boolean;
  error: string | null;
}

export const initialDerivacionesState: DerivacionesState = {
  labs: [],
  state: 'active',
  pending: false,
  error: null,
};
