import type { LabelWorklistItem } from './label-worklist.model';
import type { Sample } from './sample.model';
import { BACKEND_TO_SAMPLE_STATE } from './label-worklist.model';

export interface TubeAnalysis { labelId: number; barcode: string; name: string; }

/** Fila por tubo: extiende el view-model Sample con el detalle de etiquetas. */
export interface Tube extends Sample {
  sampleId: number | null;
  protocolId: number;
  labelIds: number[];
  analyses: TubeAnalysis[];
  rejectionReason?: string | null;
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
      analyses: labels.map(l => ({ labelId: l.labelId, barcode: l.barcode, name: l.analysisName })),
      barcode: labels.map(l => l.barcode).join(' '),  // scan matchea cualquiera
      study: labels.length === 1 ? first.analysisName : `${labels.length} análisis`,
      patient: first.patientName,
      branch: branchName,
      receivedAt: latest.updatedAt,
      urgent: labels.some(l => l.urgent),
      state: BACKEND_TO_SAMPLE_STATE[first.status] ?? 'collected',
      rejectionReason: first.rejectionReason ?? null,
    };
  });
}
