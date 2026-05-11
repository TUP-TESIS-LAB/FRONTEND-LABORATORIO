import { ModuleKey } from '@core/models/module-key.enum';

export interface NavBadge {
  text: string;
  tone: 'red' | 'green';
}

export type NavItem =
  | {
      kind: 'link';
      label: string;
      icon: string;        // PrimeIcons class, e.g. 'pi pi-home'
      path: string;        // absolute, starts with '/'
      badge?: NavBadge;
      chip?: string;       // small uppercase chip text, e.g. 'Beta', 'Root'
      moduleKey?: ModuleKey;
    }
  | {
      kind: 'expandable';
      label: string;
      icon: string;
      children: { label: string; path: string }[];
    };

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { kind: 'link', label: 'Inicio', icon: 'pi pi-home', path: '/home' },
    ],
  },
  {
    label: 'Core clínico',
    items: [
      {
        kind: 'expandable',
        label: 'Analítica',
        icon: 'pi pi-wave-pulse',
        children: [
          { label: 'Pre-analítica',  path: '/analitica/pre-analitica' },
          { label: 'Analítica',      path: '/analitica/analitica' },
          { label: 'Post-analítica', path: '/analitica/post-analitica' },
        ],
      },
      { kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/analitica/pacientes' },
      {
        kind: 'link',
        label: 'Turnos',
        icon: 'pi pi-calendar',
        path: '/turnos',
        moduleKey: ModuleKey.Turnos,
        badge: { text: '4', tone: 'red' },
      },
      {
        kind: 'link',
        label: 'Atención',
        icon: 'pi pi-users',
        path: '/analitica/atencion',
        badge: { text: '3', tone: 'green' },
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { kind: 'link', label: 'Empresa',          icon: 'pi pi-building',    path: '/empresa' },
      { kind: 'link', label: 'Roles y permisos', icon: 'pi pi-shield',      path: '/roles' },
      { kind: 'link', label: 'Sucursales',       icon: 'pi pi-map-marker',  path: '/sucursales' },
      {
        kind: 'link',
        label: 'Financiero',
        icon: 'pi pi-wallet',
        path: '/financiero',
        moduleKey: ModuleKey.Financiero,
      },
      { kind: 'link', label: 'Obras Sociales',   icon: 'pi pi-id-card',     path: '/obras-sociales' },
    ],
  },
  {
    label: 'Servicios clínicos',
    items: [
      {
        kind: 'link',
        label: 'Médicos derivantes',
        icon: 'pi pi-heart',
        path: '/medicos',
        moduleKey: ModuleKey.Medicos,
        chip: 'Beta',
      },
      {
        kind: 'link',
        label: 'Stock e insumos',
        icon: 'pi pi-box',
        path: '/stock',
        moduleKey: ModuleKey.Stock,
        chip: 'Beta',
      },
      {
        kind: 'link',
        label: 'Portal paciente',
        icon: 'pi pi-globe',
        path: '/portal',
        moduleKey: ModuleKey.Portal,
      },
    ],
  },
  {
    label: 'Administración',
    items: [
      { kind: 'link', label: 'SaaS Admin', icon: 'pi pi-cog', path: '/admin', chip: 'Root' },
    ],
  },
];
