export interface BranchTotemConfig {
  branchId: number;
  enabled: boolean;
  active: boolean;
}

export interface UpsertBranchTotemConfigRequest {
  enabled: boolean;
}
