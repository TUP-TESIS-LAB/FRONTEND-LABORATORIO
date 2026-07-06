import type { LabelWorklistItem } from './label-worklist.model';
import type { Sample } from './sample.model';
import { BACKEND_TO_SAMPLE_STATE } from './label-worklist.model';

export interface TubeAnalysis { labelId: number; analysisTypeId: number; barcode: string; name: string; }

/** Fila por tubo: extiende el view-model Sample con el detalle de etiquetas. */
export type CargaStatus = 'PARCIAL' | 'COMPLETA';

export interface Tube extends Sample {
  sampleId: number | null;
  protocolId: number;
  labelIds: number[];
  analyses: TubeAnalysis[];
  rejectionReason?: string | null;
  /** Agregación del estado de carga de las labels del tubo. undefined si el back no lo trae. */
  cargaStatus?: CargaStatus;
  /** Destino pre-calculado por la mochila (del worklist). Solo IN_TRANSIT.
   *  destinationBranchId != null → viaje inter-sucursal; null → destino local. */
  sectionId?: number | null;
  destinationBranchId?: number | null;
}

/**
 * Agrega el estado de carga de las labels de un tubo (solo dos estados; SIN se eliminó):
 * - alguna label sin cargaStatus (back viejo) → undefined (degradado suave).
 * - todas COMPLETA → COMPLETA; cualquier PARCIAL → PARCIAL.
 */
function aggregateCargaStatus(labels: LabelWorklistItem[]): CargaStatus | undefined {
  if (labels.some(l => l.cargaStatus == null)) return undefined;
  const statuses = labels.map(l => l.cargaStatus as CargaStatus);
  return statuses.every(s => s === 'COMPLETA') ? 'COMPLETA' : 'PARCIAL';
}
export function groupTubes(items: LabelWorklistItem[], branchName: string): Tube[] {
  const bySample = new Map<string, LabelWorklistItem[]>();
  for (const i of items) {
    const key = i.sampleId == null ? `label-${i.labelId}` : `sample-${i.sampleId}`;
    const arr = bySample.get(key) ?? [];
    arr.push(i);
    bySample.set(key, arr);
  }
  return Array.from(bySample.values()).map(labels => {
    const first = labels[0];
    const latest = labels.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
    return {
      id: first.sampleId != null ? `t${first.sampleId}` : `l${first.labelId}`,
      sampleId: first.sampleId,
      protocolId: first.protocolId,
      labelIds: labels.map(l => l.labelId),
      analyses: labels.map(l => ({ labelId: l.labelId, analysisTypeId: l.analysisTypeId, barcode: l.barcode, name: l.analysisName })),
      barcode: labels.map(l => l.barcode).join(' '),  // scan matchea cualquiera
      study: labels.length === 1 ? first.analysisName : `${labels.length} análisis`,
      patient: first.patientName,
      branch: branchName,
      receivedAt: latest.updatedAt,
      urgent: labels.some(l => l.urgent),
      state: BACKEND_TO_SAMPLE_STATE[first.status] ?? 'collected',
      rejectionReason: first.rejectionReason ?? null,
      cargaStatus: aggregateCargaStatus(labels),
      sectionId: first.sectionId ?? null,
      destinationBranchId: first.destinationBranchId ?? null,
    };
  });
}
