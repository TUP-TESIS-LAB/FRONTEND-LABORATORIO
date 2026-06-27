import { CashSession, SessionActivity, PaymentListItem, Payment, TenantFiscalConfig, RegisterPaymentResponse } from '../models/financiero.model';
import { SettlementSummary, SettlementDetail, PendingService } from '../models/liquidaciones.model';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';

export const FINANCIERO_FEATURE_KEY = 'financiero';

export interface FinancieroState {
  caja:   { session: CashSession | null; activity: SessionActivity | null; loading: boolean; error: string | null };
  cobros: { list: PaymentListItem[]; selected: Payment | null; loading: boolean; error: string | null };
  cobro:  { submitting: boolean; result: RegisterPaymentResponse | null; error: string | null };
  config: { current: TenantFiscalConfig | null; saving: boolean; error: string | null };
  liquidaciones: {
    list: SettlementSummary[]; listLoading: boolean; listError: string | null;
    selected: SettlementDetail | null; detailLoading: boolean; detailError: string | null;
    generating: boolean; generateError: string | null;
    lifecycleInProgress: boolean; lifecycleError: string | null;
    pending: PendingService[]; pendingLoading: boolean;
    insurers: InsurerSummary[];
    selectedInsurerPlanIds: number[];
  };
}

export const initialFinancieroState: FinancieroState = {
  caja:   { session: null, activity: null, loading: false, error: null },
  cobros: { list: [], selected: null, loading: false, error: null },
  cobro:  { submitting: false, result: null, error: null },
  config: { current: null, saving: false, error: null },
  liquidaciones: {
    list: [], listLoading: false, listError: null,
    selected: null, detailLoading: false, detailError: null,
    generating: false, generateError: null,
    lifecycleInProgress: false, lifecycleError: null,
    pending: [], pendingLoading: false,
    insurers: [],
    selectedInsurerPlanIds: [],
  },
};
