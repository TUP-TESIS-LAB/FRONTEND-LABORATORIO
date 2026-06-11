// src/app/features/analitica/muestras/models/transito.model.ts
export interface TransitoDest {
  branch: string;
  area: string;
  section: string;
}

export interface RecommendedGroup {
  /** Estable: `${branch}|${area}|${section}` */
  id: string;
  branch: string;
  area: string;
  section: string;
  sampleIds: string[];
}

export interface TemporalLote {
  /** crypto.randomUUID(). NO es el "Lote N" visible. */
  id: string;
  sampleIds: string[];
  /** '' = sin asignar */
  branch: string;
  area: string;
  section: string;
  /** epoch ms */
  createdAt: number;
}

export type SendOutcome = 'en-proceso' | 'en-transito';

export interface SendResult {
  enProceso: number;
  enTransito: number;
  /** "SUCURSAL · Área · Sección [· Lote N]" — para el detail del toast */
  detail: string;
}

export interface ScanResult {
  matchedId: string | null;
  outcome: 'added' | 'duplicate' | 'no-match';
  /** Si outcome='duplicate', el index+1 del lote donde estaba */
  duplicateLoteNumber?: number;
}
