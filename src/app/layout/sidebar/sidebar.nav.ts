import { ModuleKey } from '@core/models/module-key.enum';
import { AccessSection } from '@core/access/access.model';

export interface NavBadge { text: string; tone: 'red' | 'green'; }

export type NavItem =
  | {
      kind: 'link';
      label: string;
      icon: string;
      path: string;
      badge?: NavBadge;
      chip?: string;
      moduleKey?: ModuleKey;
      roleKey?: string;    // required role to show the item
      sectionKey?: AccessSection;
      exact?: boolean;     // routerLinkActive exact match — útil para paths padre que tienen sub-rutas en el mismo nav
    }
  | {
      kind: 'external';
      label: string;
      icon: string;
      href: string;        // URL absoluta o ruta fuera del admin-shell; abre en nueva pestaña
      chip?: string;
    }
  | {
      kind: 'expandable';
      label: string;
      icon: string;
      children: { label: string; path: string; sectionKey?: AccessSection }[];
    };

export interface NavSection { label: string; items: NavItem[]; }

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [{ kind: 'link', label: 'Inicio', icon: 'pi pi-home', path: '/home' }],
  },
  {
    label: 'Core clínico',
    items: [
      {
        kind: 'expandable', label: 'Analítica', icon: 'pi pi-wave-pulse',
        children: [
          { label: 'Pre-analítica',  path: '/analitica/pre-analitica',  sectionKey: 'PREANALITICA' },
          { label: 'Analítica',      path: '/analitica/analitica',      sectionKey: 'ANALITICA' },
          { label: 'Post-analítica', path: '/analitica/post-analitica', sectionKey: 'POSTANALITICA' },
        ],
      },
      { kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/pacientes', sectionKey: 'PACIENTES' },
      {
        kind: 'link',
        label: 'Turnos',
        icon: 'pi pi-calendar',
        path: '/turnos',
        moduleKey: ModuleKey.Turnos,
        sectionKey: 'TURNOS',
        badge: { text: '4', tone: 'red' },
        exact: true,
      },
      {
        kind: 'link',
        label: 'Recepción',
        icon: 'pi pi-bell',
        path: '/turnos/recepcion',
        moduleKey: ModuleKey.Turnos,
        sectionKey: 'TURNOS',
      },
      {
        kind: 'external',
        label: 'TV sala de espera',
        icon: 'pi pi-desktop',
        // branch 1001 = Sede Central del seed local-dev (V902).
        // El backend devuelve 404 si la branch no existe; usar id < 1000 hardcodeado
        // hace que cualquier dev clon de fresh vea el 404 hasta tocar la URL a mano.
        href: '/display/lab-demo/1001',
        chip: 'Smoke',
      },
      {
        kind: 'external',
        label: 'TV extracción',
        icon: 'pi pi-desktop',
        href: '/display/extraccion/lab-demo/1001',
        chip: 'Smoke',
      },
      {
        kind: 'external',
        label: 'Tótem',
        icon: 'pi pi-mobile',
        href: '/turnos/totem',
        chip: 'Smoke',
      },
      {
        kind: 'link',
        label: 'Configuración de agendas',
        icon: 'pi pi-calendar-plus',
        path: '/turnos/configuracion',
        roleKey: 'ADMINISTRADOR',
      },
      {
        kind: 'link',
        label: 'Cola de extracción',
        icon: 'pi pi-bolt',
        path: '/analitica/extraccion',
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { kind: 'link', label: 'Empresa',          icon: 'pi pi-building', path: '/empresa', roleKey: 'ADMINISTRADOR' },
      { kind: 'link', label: 'Sucursales',       icon: 'pi pi-building', path: '/sucursales', sectionKey: 'SUCURSALES', roleKey: 'ADMINISTRADOR' },
      { kind: 'link', label: 'Financiero',       icon: 'pi pi-wallet',   path: '/financiero', moduleKey: ModuleKey.Financiero, sectionKey: 'FINANCIERO' },
      { kind: 'link', label: 'Obras Sociales',   icon: 'pi pi-id-card',  path: '/obras-sociales', sectionKey: 'OBRAS_SOCIALES' },
    ],
  },
  {
    label: 'Servicios clínicos',
    items: [
      { kind: 'link', label: 'Médicos derivantes', icon: 'pi pi-heart', path: '/medicos', moduleKey: ModuleKey.Medicos, chip: 'Beta' },
      { kind: 'link', label: 'Stock e insumos',    icon: 'pi pi-box',   path: '/stock',   moduleKey: ModuleKey.Stock, sectionKey: 'STOCK', chip: 'Beta' },
      { kind: 'link', label: 'Portal paciente',    icon: 'pi pi-globe', path: '/portal',  moduleKey: ModuleKey.Portal, sectionKey: 'PORTAL' },
    ],
  },
];
