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
      roleKey?: string;
      sectionKey?: AccessSection;
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
      { kind: 'link', label: 'Turnos', icon: 'pi pi-calendar', path: '/turnos', moduleKey: ModuleKey.Turnos, sectionKey: 'TURNOS', badge: { text: '4', tone: 'red' } },
      { kind: 'link', label: 'Atención', icon: 'pi pi-users', path: '/analitica/atencion', sectionKey: 'ATENCION', badge: { text: '3', tone: 'green' } },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { kind: 'link', label: 'Empresa',          icon: 'pi pi-building', path: '/empresa', roleKey: 'ADMINISTRADOR' },
      { kind: 'link', label: 'Roles y permisos', icon: 'pi pi-shield',   path: '/roles',   roleKey: 'ADMINISTRADOR' },
      { kind: 'link', label: 'Sucursales',       icon: 'pi pi-building', path: '/sucursales/configuracion', sectionKey: 'SUCURSALES' },
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
