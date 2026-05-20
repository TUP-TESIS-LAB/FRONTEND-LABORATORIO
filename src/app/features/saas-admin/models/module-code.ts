export type ModuleCode =
  | 'SAAS_ADMIN'
  | 'EMPRESA'
  | 'SUCURSALES'
  | 'ANALITICA'
  | 'PORTAL'
  | 'TURNOS'
  | 'FINANCIERO'
  | 'STOCK'
  | 'FAMILIA';

export type ModuleKind = 'PLATFORM' | 'CORE' | 'ACTIVABLE';

export interface ModuleCatalogEntry {
  code: ModuleCode;
  kind: ModuleKind;
  label: string;
  description: string;
  icon: string;
}

export const MODULE_CATALOG: readonly ModuleCatalogEntry[] = [
  { code: 'EMPRESA',     kind: 'CORE',      label: 'Empresa',     description: 'Datos de empresa, usuarios y roles del tenant.', icon: 'pi pi-building' },
  { code: 'SUCURSALES',  kind: 'CORE',      label: 'Sucursales',  description: 'Gestión de sucursales del laboratorio.',        icon: 'pi pi-map-marker' },
  { code: 'ANALITICA',   kind: 'CORE',      label: 'Analítica',   description: 'Procesos pre/analítico/post-analítico.',        icon: 'pi pi-wave-pulse' },
  { code: 'PORTAL',      kind: 'ACTIVABLE', label: 'Portal paciente', description: 'Acceso del paciente a sus estudios.',       icon: 'pi pi-globe' },
  { code: 'TURNOS',      kind: 'ACTIVABLE', label: 'Turnos',      description: 'Agenda y reserva de turnos.',                  icon: 'pi pi-calendar' },
  { code: 'FINANCIERO',  kind: 'ACTIVABLE', label: 'Financiero',  description: 'Facturación y cobranzas.',                     icon: 'pi pi-wallet' },
  { code: 'STOCK',       kind: 'ACTIVABLE', label: 'Stock',       description: 'Inventario e insumos.',                        icon: 'pi pi-box' },
  { code: 'FAMILIA',     kind: 'ACTIVABLE', label: 'Familia',     description: 'Vinculación de pacientes en grupo familiar.',  icon: 'pi pi-users' },
];

export const ACTIVABLE_MODULES = MODULE_CATALOG.filter((m) => m.kind === 'ACTIVABLE');
export const CORE_MODULES      = MODULE_CATALOG.filter((m) => m.kind === 'CORE');
