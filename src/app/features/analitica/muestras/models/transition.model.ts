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
  /**
   * Si está presente, la transición aparece en el menú kebab por-fila.
   * `label` es el texto imperativo de la acción (ej. 'Rechazar' vs el `label` 'Rechazada');
   * `icon` cae al `icon` del target si se omite. Ausente = no va al menú por-fila.
   */
  rowMenu?: { label: string; icon?: string };
}

export interface TransitionDest {
  sucursal?: string;
  area?: string;
  lab?: number;
}

/** Acciones que el menú kebab por-fila puede disparar (subconjunto de TransitionKey). */
export type RowActionKey = 'rollback' | 'rejected' | 'lost' | 'derived';

/** Ítem del menú kebab por-fila, derivado de un `Transition` con `rowMenu` en la config. */
export interface RowAction {
  key: RowActionKey;
  label: string;
  /** PrimeIcons name, ej. 'pi-ban'. */
  icon: string;
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
