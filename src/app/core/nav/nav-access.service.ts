import { Injectable, computed, inject } from '@angular/core';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { AccessRegistry } from '@core/access/access-registry';
import { TokenService } from '@core/auth/token.service';
import { NAV_SECTIONS, NavItem, NavSection } from '@layout/sidebar/sidebar.nav';

export interface NavSearchEntry {
  label: string;
  path: string;
  icon: string;
  sectionLabel: string;
  external?: boolean;
}

/**
 * Única fuente de verdad para "¿qué puede ver este usuario en la navegación?":
 * cruza módulos activos del tenant + secciones concedidas por el admin + rol
 * del usuario contra NAV_SECTIONS. La usan tanto el sidebar (para renderizar)
 * como el buscador global del topbar (para ofrecer solo rutas permitidas).
 */
@Injectable({ providedIn: 'root' })
export class NavAccessService {
  private readonly registry = inject(ModuleRegistry);
  private readonly access = inject(AccessRegistry);
  private readonly token = inject(TokenService);

  isItemVisible(item: NavItem): boolean {
    if (item.kind === 'expandable') {
      if (item.moduleKey && !this.registry.isActive(item.moduleKey)) return false;
      if (item.sectionKey && !this.access.has(item.sectionKey)) return false;
      return this.visibleChildren(item).length > 0;
    }
    if (item.kind === 'external') return true;
    if (item.moduleKey && !this.registry.isActive(item.moduleKey)) return false;
    if (item.roleKey && !this.token.getRoles().includes(item.roleKey)) return false;
    if (item.sectionKey && !this.access.has(item.sectionKey)) return false;
    return true;
  }

  visibleChildren(item: NavItem) {
    if (item.kind !== 'expandable') return [];
    return item.children.filter((c) =>
      (!c.sectionKey || this.access.has(c.sectionKey)) &&
      (!c.roleKey || this.token.getRoles().includes(c.roleKey)),
    );
  }

  private applyChildVisibility(item: NavItem): NavItem {
    if (item.kind !== 'expandable') return item;
    return { ...item, children: this.visibleChildren(item) };
  }

  readonly visibleSections = computed<NavSection[]>(() =>
    NAV_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items
          .map((item) => this.applyChildVisibility(item))
          .filter((item) => this.isItemVisible(item)),
      }))
      .filter((section) => section.items.length > 0),
  );

  /** Rutas navegables (links + hijos de expandables) que el usuario puede ver, aplanadas para búsqueda. */
  readonly searchableEntries = computed<NavSearchEntry[]>(() =>
    this.visibleSections().flatMap((section) =>
      section.items.flatMap((item): NavSearchEntry[] => {
        if (item.kind === 'link') {
          return [{ label: item.label, path: item.path, icon: item.icon, sectionLabel: section.label }];
        }
        if (item.kind === 'expandable') {
          return item.children.map((c) => ({
            label: c.label,
            path: c.path,
            icon: c.icon ?? item.icon,
            sectionLabel: section.label,
            external: c.external,
          }));
        }
        return [];
      }),
    ),
  );
}
