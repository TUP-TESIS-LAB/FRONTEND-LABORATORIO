export interface TransitoDest {
  branch: string;
  area: string;
  section: string;
}

/** Patch de destino para un lote: nombres para display + ids reales para el despacho/derivación. */
export interface LoteDestPatch extends Partial<TransitoDest> {
  sectionId?: number | null;
  destinationBranchId?: number | null;
  observation?: string;
}

/** Opción de sección (workspace) para asignación manual. */
export interface SectionOption {
  sectionId: number;
  sectionName: string;
  areaName: string;
  /**
   * Texto que se muestra en la opción.
   * Misma sucursal: "Área · Sección" (o solo la sección si no se conoce el área).
   * Otra sucursal (fallback inter-sucursal): se agrega "(→ Sucursal)".
   */
  label: string;
  /** Nombre de la sucursal destino, cuando se conoce (back nuevo). */
  branchName?: string;
  /** true si la sección destino está en otra sucursal distinta de la actual. */
  isOtherBranch?: boolean;
}

export const SIN_DESTINO_GROUP_ID = 'sin-destino';

export interface RecommendedGroup {
  /** `ws-{sectionId}` para grupos del routing; `sin-destino` para los no resolubles. */
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
  /** branch/area/section: '' significa sin asignar; el lote no se puede enviar hasta resolver el destino. */
  branch: string;
  area: string;
  section: string;
  /** epoch ms */
  createdAt: number;
  /** Sección real (workspace) si el destino es la sucursal actual. Opcional: lotes viejos no lo tienen. */
  sectionId?: number | null;
  /** Sucursal real de destino si es derivación a otra sucursal. Opcional: lotes viejos no lo tienen. */
  destinationBranchId?: number | null;
  /** Observación de la derivación (solo aplica a destino en otra sucursal). */
  observation?: string;
}

export interface SendResult {
  /** Tubos despachados a una sección de esta sucursal. */
  enProceso: number;
  /** Tubos derivados a otra sucursal. */
  enTransito: number;
  /** Tubos que no se pudieron despachar por no tener vínculo (sampleId null). */
  skipped: number;
  /** "SUCURSAL · Área · Sección" — para detalle informativo */
  detail: string;
}

export interface ScanResult {
  matchedId: string | null;
  outcome: 'added' | 'duplicate' | 'no-match';
  /** Si outcome='duplicate', el index+1 del lote donde estaba */
  duplicateLoteNumber?: number;
}
