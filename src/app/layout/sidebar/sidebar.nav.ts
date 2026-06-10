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
      // `external: true` → el hijo abre en pestaña nueva (href = path), como los items
      // `kind: 'external'`. Permite agrupar pantallas externas dentro de un desplegable.
      children: { label: string; path: string; sectionKey?: AccessSection; external?: boolean }[];
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
        kind: 'expandable', label: 'Muestras', icon: 'pi pi-flask',
        children: [
          { label: 'Recolección',   path: '/analitica/recoleccion',   sectionKey: 'PREANALITICA' },
          { label: 'Traslado',      path: '/analitica/traslado',      sectionKey: 'PREANALITICA' },
          { label: 'Procesamiento', path: '/analitica/procesamiento', sectionKey: 'ANALITICA' },
          { label: 'Descarte',      path: '/analitica/descarte',      sectionKey: 'POSTANALITICA' },
        ],
      },
      { kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/pacientes', sectionKey: 'PACIENTES' },
      {
        kind: 'link',
        label: 'Recepción',
        icon: 'pi pi-bell',
        path: '/turnos/recepcion',
        moduleKey: ModuleKey.Turnos,
        sectionKey: 'TURNOS',
      },
      {
        // Pantallas externas que el laboratorio expone en sala/recepción (TVs + tótem).
        // Agrupadas en un desplegable porque se abren en otro dispositivo/pestaña, no
        // son pantallas del shell admin. branch 1001 = Sede Central del seed local-dev (V902).
        kind: 'expandable',
        label: 'Pantallas en sala',
        icon: 'pi pi-desktop',
        children: [
          { label: 'TV sala de espera', path: '/display/lab-demo/1001',            external: true },
          { label: 'TV extracción',     path: '/display/extraccion/lab-demo/1001', external: true },
          { label: 'Tótem',             path: '/turnos/totem',                      external: true },
        ],
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
