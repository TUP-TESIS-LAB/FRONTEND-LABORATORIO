export type ModuleCode = 'PORTAL' | 'TURNOS' | 'FINANCIERO' | 'MEDICOS' | 'STOCK';

export interface ModuloTenant {
  moduleCode: ModuleCode;
  enabled: boolean;
}

export interface ModuloMeta {
  code: ModuleCode;
  label: string;
  description: string;
  icon: string;
}

export const MODULO_META: Record<ModuleCode, ModuloMeta> = {
  PORTAL: {
    code: 'PORTAL',
    label: 'Portal de pacientes',
    description: 'Acceso público para que los pacientes consulten estudios y reserven turnos.',
    icon: 'pi pi-globe',
  },
  TURNOS: {
    code: 'TURNOS',
    label: 'Turnos',
    description: 'Gestión de agenda, calendario y reserva de turnos.',
    icon: 'pi pi-calendar',
  },
  FINANCIERO: {
    code: 'FINANCIERO',
    label: 'Financiero',
    description: 'Facturación, cobros y obras sociales.',
    icon: 'pi pi-wallet',
  },
  MEDICOS: {
    code: 'MEDICOS',
    label: 'Médicos derivantes',
    description: 'ABM de médicos que derivan estudios.',
    icon: 'pi pi-id-card',
  },
  STOCK: {
    code: 'STOCK',
    label: 'Stock',
    description: 'Inventario de insumos y reactivos.',
    icon: 'pi pi-box',
  },
};
