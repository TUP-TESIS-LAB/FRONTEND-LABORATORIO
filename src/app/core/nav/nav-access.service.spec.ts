import { TestBed } from '@angular/core/testing';
import { NavAccessService } from './nav-access.service';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { AccessRegistry } from '@core/access/access-registry';
import { TokenService } from '@core/auth/token.service';

describe('NavAccessService', () => {
  function setup(sections: string[], roles: string[]) {
    TestBed.configureTestingModule({
      providers: [
        { provide: ModuleRegistry, useValue: { isActive: () => true } },
        { provide: AccessRegistry, useValue: { has: (s: string) => sections.includes(s) } },
        { provide: TokenService, useValue: { getRoles: () => roles } },
      ],
    });
    return TestBed.inject(NavAccessService);
  }

  it('searchableEntries incluye los links de nivel superior visibles', () => {
    const nav = setup(['RECEPCION'], []);
    const labels = nav.searchableEntries().map((e) => e.label);
    expect(labels).toContain('Recepción');
  });

  it('searchableEntries excluye rutas cuya sección no fue concedida', () => {
    const nav = setup([], []);
    const labels = nav.searchableEntries().map((e) => e.label);
    expect(labels).not.toContain('Recepción');
  });

  it('searchableEntries aplana los hijos de un expandable visible, respetando su propio roleKey', () => {
    const nav = setup(['FINANCIERO'], ['SECRETARIA']);
    const labels = nav.searchableEntries().map((e) => e.label);
    expect(labels).toContain('Caja');
    expect(labels).not.toContain('Cajas'); // roleKey: ADMINISTRADOR, secretaria no lo tiene
  });

  it('searchableEntries no incluye hijos de un expandable cuya sección no fue concedida', () => {
    const nav = setup([], ['ADMINISTRADOR']);
    const labels = nav.searchableEntries().map((e) => e.label);
    expect(labels).not.toContain('Caja');
    expect(labels).not.toContain('Cajas');
  });

  it('visibleSections y searchableEntries quedan consistentes: todo lo buscable está en el sidebar visible', () => {
    const nav = setup(['RECEPCION', 'FINANCIERO', 'PACIENTES'], ['ADMINISTRADOR']);
    const sidebarLabels = new Set(
      nav.visibleSections().flatMap((s) =>
        s.items.flatMap((i) => (i.kind === 'expandable' ? i.children.map((c) => c.label) : [i.label])),
      ),
    );
    for (const entry of nav.searchableEntries()) {
      expect(sidebarLabels.has(entry.label)).toBe(true);
    }
  });
});
