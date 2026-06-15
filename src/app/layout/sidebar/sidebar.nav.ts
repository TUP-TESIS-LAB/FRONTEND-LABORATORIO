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
      children: { label: string; path: string; icon?: string; sectionKey?: AccessSection; external?: boolean }[];
    };

export interface NavSection { label: string; items: NavItem[]; }

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Recepción',
    items: [
      { kind: 'link', label: 'Recepción', icon: 'pi pi-bell', path: '/turnos/recepcion', sectionKey: 'RECEPCION' },
      { kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/pacientes', sectionKey: 'PACIENTES' },
      { kind: 'link', label: 'Configuración de agendas', icon: 'pi pi-calendar-plus', path: '/turnos/configuracion', moduleKey: ModuleKey.Turnos, sectionKey: 'AGENDAS' },
      { kind: 'link', label: 'Médicos derivantes', icon: 'pi pi-heart', path: '/medicos', moduleKey: ModuleKey.Medicos, sectionKey: 'MEDICOS' },
    ],
  },
  {
    label: 'Clínico',
    items: [
      {
        kind: 'expandable', label: 'Muestras', icon: 'pi pi-flask',
        children: [
          { label: 'Recolección',   path: '/analitica/recoleccion',   sectionKey: 'PREANALITICA' },
          { label: 'Traslado',      path: '/analitica/traslado',      sectionKey: 'PREANALITICA' },
          { label: 'Procesamiento', path: '/analitica/procesamiento', sectionKey: 'ANALITICA' },
          { label: 'Validación',    path: '/analitica/validacion',    sectionKey: 'ANALITICA' },
          { label: 'Descarte',      path: '/analitica/descarte',      sectionKey: 'POSTANALITICA' },
        ],
      },
      { kind: 'link', label: 'Cola de extracción', icon: 'pi pi-bolt', path: '/analitica/extraccion', sectionKey: 'EXTRACCIONES' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { kind: 'link', label: 'Empresa',          icon: 'pi pi-building', path: '/empresa', sectionKey: 'EMPRESA' },
      { kind: 'link', label: 'Sucursales',       icon: 'pi pi-building', path: '/sucursales', sectionKey: 'SUCURSALES' },
      { kind: 'link', label: 'Obras sociales',   icon: 'pi pi-id-card',  path: '/obras-sociales', sectionKey: 'OBRAS_SOCIALES' },
      { kind: 'link', label: 'Financiero',       icon: 'pi pi-wallet',   path: '/financiero', moduleKey: ModuleKey.Financiero, sectionKey: 'FINANCIERO' },
      { kind: 'link', label: 'Stock e insumos',  icon: 'pi pi-box',      path: '/stock', moduleKey: ModuleKey.Stock, sectionKey: 'STOCK' },
    ],
  },
];
