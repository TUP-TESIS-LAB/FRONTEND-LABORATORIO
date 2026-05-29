import { AgendaConfig } from '../../models/agenda-config.model';

export interface AgendasState {
  configsByBranch: Record<number, AgendaConfig[]>;
  loadingBranch: number | null;
  pending: boolean;
  error: unknown | null;
}

export const initialAgendasState: AgendasState = {
  configsByBranch: {},
  loadingBranch: null,
  pending: false,
  error: null,
};
