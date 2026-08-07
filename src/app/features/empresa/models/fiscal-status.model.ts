export type ArcaEnvironment = 'HOMO' | 'PROD';

/**
 * Estado de solo lectura de la facturación electrónica del laboratorio.
 *
 * El backend no expone la identidad fiscal ni las credenciales: de cada requisito solo llega si
 * está cumplido o no. `missingFields` ya viene en español y listo para mostrar — no traducirlo
 * ni mapearlo acá, la regla de qué falta vive en el caso de uso.
 */
export interface FiscalStatus {
  /** El laboratorio eligió emitir con ARCA, aunque todavía le falten requisitos. */
  electronicInvoicingEnabled: boolean;
  /** Ambiente de emisión, o null si no está emitiendo con ARCA. */
  environment: ArcaEnvironment | null;
  missingFields: string[];
  /** Está habilitado y no le falta nada: recién acá emite comprobantes fiscales de verdad. */
  readyToInvoice: boolean;
}
