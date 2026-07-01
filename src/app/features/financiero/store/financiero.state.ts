import {
  CashSession, SessionActivity, PaymentListItem, Payment, TenantFiscalConfig,
  RegisterPaymentResponse, CashRegister, BankAccount, BranchOtherMedia, BranchesSummary,
} from '../models/financiero.model';

export const FINANCIERO_FEATURE_KEY = 'financiero';

export interface FinancieroState {
  caja:    { registers: CashRegister[]; session: CashSession | null; activity: SessionActivity | null; loading: boolean; registersLoading: boolean; error: string | null };
  otros:   { data: BranchOtherMedia | null; loading: boolean; error: string | null };
  sucursales: { data: BranchesSummary | null; loading: boolean; error: string | null };
  cuentas: { list: BankAccount[]; loading: boolean; saving: boolean; error: string | null };
  cobros:  { list: PaymentListItem[]; selected: Payment | null; loading: boolean; error: string | null };
  cobro:   { submitting: boolean; result: RegisterPaymentResponse | null; error: string | null };
  config:  { current: TenantFiscalConfig | null; saving: boolean; error: string | null };
}

export const initialFinancieroState: FinancieroState = {
  caja:    { registers: [], session: null, activity: null, loading: false, registersLoading: false, error: null },
  otros:   { data: null, loading: false, error: null },
  sucursales: { data: null, loading: false, error: null },
  cuentas: { list: [], loading: false, saving: false, error: null },
  cobros:  { list: [], selected: null, loading: false, error: null },
  cobro:   { submitting: false, result: null, error: null },
  config:  { current: null, saving: false, error: null },
};
