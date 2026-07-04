import {
  CashSession, SessionActivity, PaymentListItem, Payment, TenantFiscalConfig,
  RegisterPaymentResponse, CashRegister, BankAccount, BranchOtherMedia, MovementsFeed,
} from '../models/financiero.model';
import { SettlementSummary, SettlementDetail, PendingService, SettlementPreviewDetail, InsurerPlanOption } from '../models/liquidaciones.model';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';

export const FINANCIERO_FEATURE_KEY = 'financiero';

export interface FinancieroState {
  caja:    { registers: CashRegister[]; session: CashSession | null; activity: SessionActivity | null; loading: boolean; registersLoading: boolean; error: string | null };
  otros:   { data: BranchOtherMedia | null; loading: boolean; error: string | null };
  movimientos: { data: MovementsFeed | null; loading: boolean; error: string | null };
  cuentas: { list: BankAccount[]; loading: boolean; saving: boolean; error: string | null };
  cobros:  { list: PaymentListItem[]; selected: Payment | null; loading: boolean; error: string | null };
  cobro:   { submitting: boolean; result: RegisterPaymentResponse | null; error: string | null };
  config:  { current: TenantFiscalConfig | null; saving: boolean; error: string | null };
  liquidaciones: {
    list: SettlementSummary[]; listLoading: boolean; listError: string | null;
    selected: SettlementDetail | null; detailLoading: boolean; detailError: string | null;
    generating: boolean; generateError: string | null;
    lifecycleInProgress: boolean; lifecycleError: string | null;
    exporting: boolean;
    pending: PendingService[]; pendingLoading: boolean;
    insurers: InsurerSummary[];
    insurerPlans: InsurerPlanOption[];
    previewDetail: SettlementPreviewDetail | null; previewLoading: boolean; previewError: string | null;
  };
}

export const initialFinancieroState: FinancieroState = {
  caja:    { registers: [], session: null, activity: null, loading: false, registersLoading: false, error: null },
  otros:   { data: null, loading: false, error: null },
  movimientos: { data: null, loading: false, error: null },
  cuentas: { list: [], loading: false, saving: false, error: null },
  cobros:  { list: [], selected: null, loading: false, error: null },
  cobro:   { submitting: false, result: null, error: null },
  config:  { current: null, saving: false, error: null },
  liquidaciones: {
    list: [], listLoading: false, listError: null,
    selected: null, detailLoading: false, detailError: null,
    generating: false, generateError: null,
    lifecycleInProgress: false, lifecycleError: null,
    exporting: false,
    pending: [], pendingLoading: false,
    insurers: [],
    insurerPlans: [],
    previewDetail: null, previewLoading: false, previewError: null,
  },
};
