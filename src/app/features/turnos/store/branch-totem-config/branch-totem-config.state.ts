export interface BranchTotemConfigState {
  branchId: number | null;
  enabled: boolean | null;
  atencionDisplayEnabled: boolean | null;
  extraccionDisplayEnabled: boolean | null;
  loading: boolean;
  error: unknown | null;
}

export const initialBranchTotemConfigState: BranchTotemConfigState = {
  branchId: null,
  enabled: null,
  atencionDisplayEnabled: null,
  extraccionDisplayEnabled: null,
  loading: false,
  error: null,
};
