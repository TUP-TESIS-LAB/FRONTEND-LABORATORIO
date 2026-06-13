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

/** Opción de sección (workspace de la sucursal actual) para asignación manual. */
export interface SectionOption {
  sectionId: number;
  sectionName: string;
  areaName: string;
  /** "Área · Sección" o el nombre de la sección si no se conoce el área. */
  label: string;
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

export type SendOutcome = 'en-proceso' | 'en-transito';

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
