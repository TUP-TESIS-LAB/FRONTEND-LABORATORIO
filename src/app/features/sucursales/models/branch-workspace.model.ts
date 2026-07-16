export interface BranchWorkspace {
  id: number;
  branchId: number;
  areaId: number;
  sectionId: number;
}

export interface BranchWorkspaceCreateInput {
  areaId: number;
  sectionId: number;
}
