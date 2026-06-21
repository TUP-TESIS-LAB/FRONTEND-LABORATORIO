export type SampleState =
  | 'collected'
  | 'transito'
  | 'processing'
  | 'completed'
  | 'derived'
  | 'rejected'
  | 'lost'
  | 'discarded';

export interface Sample {
  id: string;
  barcode: string;
  study: string;
  patient: string;
  branch: string;
  /** ISO 8601 timestamp del momento de recepción/toma. */
  receivedAt: string;
  urgent: boolean;
  state: SampleState;
  destino?: string;
  area?: string;
}
