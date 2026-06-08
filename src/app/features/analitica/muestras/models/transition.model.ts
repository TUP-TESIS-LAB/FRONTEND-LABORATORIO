import { SampleState } from './sample.model';

export type DestField = 'sucursal' | 'area' | 'areaFixed' | 'lab';
export type TransitionColor = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'slate';

export type TransitionKey =
  | 'transito'
  | 'rejected'
  | 'lost'
  | 'area'
  | 'reroute'
  | 'derived'
  | 'completed'
  | 'discard'
  | 'rollback';

export interface Transition {
  key: TransitionKey;
  label: string;
  toLabel: string;
  toState: SampleState;
  color: TransitionColor;
  icon: string;
  desc: string;
  reco?: string;
  sep?: boolean;
  fields: DestField[];
  reason?: string;
}

export interface TransitionDest {
  sucursal?: string;
  area?: string;
  lab?: string;
}

export type ScreenKey = 'recoleccion' | 'traslado' | 'procesamiento' | 'descarte';

export interface ScreenConfig {
  key: ScreenKey;
  crumb: string;
  title: string;
  sub: string;
  source: SampleState;
  countLabel: string;
  targets: Transition[];
}
