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
  date: string;
  time: string;
  urgent: boolean;
  state: SampleState;
  destino?: string;
  area?: string;
}
