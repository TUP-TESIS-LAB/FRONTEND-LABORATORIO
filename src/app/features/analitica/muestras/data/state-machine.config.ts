import type { ScreenConfig, ScreenKey, Transition } from '../models/transition.model';

const transitoTarget: Transition = {
  key: 'transito', label: 'En tránsito', toLabel: 'En tránsito', toState: 'transito',
  color: 'green', icon: 'pi-truck',
  desc: 'Marcar como en tránsito hacia recepción.',
  reco: 'CAMINO FELIZ', fields: [],
};

const rejectedTarget: Transition = {
  key: 'rejected', label: 'Rechazada', toLabel: 'Rechazada', toState: 'rejected',
  color: 'red', icon: 'pi-ban',
  desc: 'La muestra no cumple criterios de calidad.',
  fields: [],
  reason: 'Motivo del rechazo (opcional)',
};

const lostTarget: Transition = {
  key: 'lost', label: 'Perdida', toLabel: 'Perdida', toState: 'lost',
  color: 'amber', icon: 'pi-exclamation-triangle',
  desc: 'Se reporta pérdida del material.',
  fields: [],
  reason: 'Detalle de la pérdida (opcional)',
};

const RECOLECCION: ScreenConfig = {
  key: 'recoleccion',
  crumb: 'Muestras › Recolección',
  title: 'Recolección',
  sub: 'Muestras recolectadas, pendientes de traslado.',
  source: 'collected',
  countLabel: 'en estado Recolectada',
  targets: [transitoTarget, rejectedTarget, lostTarget],
};

const TRASLADO: ScreenConfig = {
  key: 'traslado',
  crumb: 'Muestras › Traslado',
  title: 'Traslado',
  sub: 'Muestras en tránsito hacia recepción o destino externo.',
  source: 'transito',
  countLabel: 'en estado En tránsito',
  targets: [
    {
      key: 'area', label: 'Asignar a área (esta sucursal)', toLabel: 'En proceso', toState: 'processing',
      color: 'green', icon: 'pi-inbox',
      desc: 'Recepción y asignación a un área de esta sucursal.',
      reco: 'RECEPCIÓN',
      fields: ['areaFixed'],
    },
    {
      key: 'reroute', label: 'Trasladar a otra sucursal', toLabel: 'En tránsito', toState: 'transito',
      color: 'blue', icon: 'pi-truck',
      desc: 'Cambiar el destino a otra sucursal de la red.',
      fields: ['sucursal', 'area'],
    },
    {
      key: 'derived', label: 'Derivar a laboratorio externo', toLabel: 'Derivada', toState: 'derived',
      color: 'purple', icon: 'pi-building',
      desc: 'Enviar al laboratorio de referencia.',
      fields: ['lab'],
    },
    {
      key: 'rollback', label: 'Volver a estado anterior', toLabel: 'Recolectada', toState: 'collected',
      color: 'slate', icon: 'pi-undo',
      desc: 'Volver a Recolectada por carga errónea.',
      sep: true,
      fields: [],
      reason: 'Motivo del rollback',
    },
  ],
};

const PROCESAMIENTO: ScreenConfig = {
  key: 'procesamiento',
  crumb: 'Muestras › Procesamiento',
  title: 'Procesamiento',
  sub: 'Muestras siendo procesadas por las áreas.',
  source: 'processing',
  countLabel: 'en estado En proceso',
  targets: [
    {
      key: 'completed', label: 'Completar', toLabel: 'Completada', toState: 'completed',
      color: 'green', icon: 'pi-check-circle',
      desc: 'Finalizar el procesamiento.',
      reco: 'CAMINO FELIZ',
      fields: [],
    },
    rejectedTarget,
    lostTarget,
    {
      key: 'rollback', label: 'Volver a estado anterior', toLabel: 'En tránsito', toState: 'transito',
      color: 'slate', icon: 'pi-undo',
      desc: 'Volver a En tránsito por carga errónea.',
      sep: true,
      fields: [],
      reason: 'Motivo del rollback',
    },
  ],
};

const DESCARTE: ScreenConfig = {
  key: 'descarte',
  crumb: 'Muestras › Descarte',
  title: 'Descarte',
  sub: 'Muestras completadas listas para descarte físico.',
  source: 'completed',
  countLabel: 'en estado Completada',
  targets: [
    {
      key: 'discard', label: 'Descartar (físico)', toLabel: 'Descartada', toState: 'discarded',
      color: 'red', icon: 'pi-trash',
      desc: 'Marcar como descarte físico realizado.',
      reco: 'DESCARTE',
      fields: [],
      reason: 'Observación del descarte (opcional)',
    },
    {
      key: 'rollback', label: 'Volver a estado anterior', toLabel: 'En proceso', toState: 'processing',
      color: 'slate', icon: 'pi-undo',
      desc: 'Volver a En proceso por carga errónea.',
      sep: true,
      fields: [],
      reason: 'Motivo del rollback',
    },
  ],
};

export const SCREENS: Record<ScreenKey, ScreenConfig> = {
  recoleccion: RECOLECCION,
  traslado: TRASLADO,
  procesamiento: PROCESAMIENTO,
  descarte: DESCARTE,
};
