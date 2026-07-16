export interface BranchTotemConfig {
  branchId: number;
  enabled: boolean;
  active: boolean;
  atencionDisplayEnabled: boolean;
  extraccionDisplayEnabled: boolean;
}

export interface UpsertBranchTotemConfigRequest {
  enabled: boolean;
  atencionDisplayEnabled: boolean;
  extraccionDisplayEnabled: boolean;
}
