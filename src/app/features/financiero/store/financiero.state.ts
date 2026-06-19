import { CashSession, SessionActivity, PaymentListItem, Payment, TenantFiscalConfig } from '../models/financiero.model';

export const FINANCIERO_FEATURE_KEY = 'financiero';

export interface FinancieroState {
  caja:   { session: CashSession | null; activity: SessionActivity | null; loading: boolean; error: string | null };
  cobros: { list: PaymentListItem[]; selected: Payment | null; loading: boolean; error: string | null };
  config: { current: TenantFiscalConfig | null; saving: boolean; error: string | null };
}

export const initialFinancieroState: FinancieroState = {
  caja:   { session: null, activity: null, loading: false, error: null },
  cobros: { list: [], selected: null, loading: false, error: null },
  config: { current: null, saving: false, error: null },
};
