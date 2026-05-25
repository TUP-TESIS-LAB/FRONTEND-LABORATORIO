export interface BranchTotemConfigState {
  branchId: number | null;
  enabled: boolean | null;
  loading: boolean;
  error: unknown | null;
}

export const initialBranchTotemConfigState: BranchTotemConfigState = {
  branchId: null,
  enabled: null,
  loading: false,
  error: null,
};
