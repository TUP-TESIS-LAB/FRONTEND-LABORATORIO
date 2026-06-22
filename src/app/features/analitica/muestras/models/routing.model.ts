export interface WorkSection {
  branchId: number;
  areaId: number;
  sectionId: number;
  areaName: string;
  sectionName: string;
  /** Nombre de la sucursal destino. El back lo resuelve (puede ser otra sucursal del tenant). */
  branchName: string;
}

export interface RoutingAssignment {
  protocolId: number;
  sampleId: number;
  analysisOrderId: number;
  analysisName: string;
}

export interface RoutingGroup {
  workSection: WorkSection;
  assignments: RoutingAssignment[];
}

export type UnresolvableReason = 'NO_SECTION_CONFIGURED' | 'NO_WORKSPACE_FOUND';

export interface UnresolvableSample {
  protocolId: number;
  sampleId: number;
  analysisOrderId: number;
  analysisName: string;
  reason: UnresolvableReason;
}

export interface RoutingResolveResponse {
  groups: RoutingGroup[];
  unresolvable: UnresolvableSample[];
}

/** Mirrors BranchWorkspaceResponse from the backend. */
export interface BranchWorkspace {
  id: number;
  branchId: number;
  areaId: number;
  sectionId: number;
}
