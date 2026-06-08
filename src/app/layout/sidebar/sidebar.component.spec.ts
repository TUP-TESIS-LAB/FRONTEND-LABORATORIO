import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SidebarComponent } from './sidebar.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { AccessRegistry } from '@core/access/access-registry';
import { TokenService } from '@core/auth/token.service';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';

describe('SidebarComponent visibility', () => {
  function setup(sections: string[], roles: string[]) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockStore({
          initialState: {},
          selectors: [{ selector: selectTenantConfig, value: null }],
        }),
        { provide: ModuleRegistry, useValue: { isActive: () => true } },
        { provide: AccessRegistry, useValue: { has: (s: string) => sections.includes(s) } },
        { provide: TokenService, useValue: { getRoles: () => roles } },
      ],
    });
    return TestBed.createComponent(SidebarComponent).componentInstance;
  }

  it('muestra Turnos solo si la seccion TURNOS esta concedida', () => {
    const withTurnos = setup(['TURNOS'], []);
    const core = withTurnos.visibleSections().find((s) => s.label === 'Core clínico');
    expect(core?.items.some((i) => i.label === 'Turnos')).toBe(true);

    const withoutTurnos = setup([], []);
    const core2 = withoutTurnos.visibleSections().find((s) => s.label === 'Core clínico');
    expect(core2?.items.some((i) => i.label === 'Turnos') ?? false).toBe(false);
  });

  it('Empresa (admin-only) visible solo para ADMINISTRADOR', () => {
    const admin = setup([], ['ADMINISTRADOR']);
    expect(admin.visibleSections().some((s) => s.items.some((i) => i.label === 'Empresa'))).toBe(true);
    const noAdmin = setup([], []);
    expect(noAdmin.visibleSections().some((s) => s.items.some((i) => i.label === 'Empresa'))).toBe(false);
  });

  it('muestra el branding (logo + nombre) con fallback cuando no hay tenant config', () => {
    setup([], []);
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    const brand: HTMLElement | null = fixture.nativeElement.querySelector('.ui-sidebar__brand');
    expect(brand).not.toBeNull();
    const logo = brand?.querySelector('.ui-sidebar__logo') as HTMLImageElement | null;
    expect(logo).not.toBeNull();
    expect(logo?.getAttribute('src')).toBe('logo.svg');
    expect(brand?.querySelector('.ui-sidebar__brand-name')?.textContent?.trim()).toBe('LabCore');
  });

  it('en modo colapsado oculta los labels y aplica la clase collapsed al nav', () => {
    setup(['TURNOS'], ['ADMINISTRADOR']);
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();

    const nav: HTMLElement = fixture.nativeElement.querySelector('.ui-sidebar');
    expect(nav.classList.contains('ui-sidebar--collapsed')).toBe(true);
    expect(fixture.nativeElement.querySelector('.ui-sidebar__label')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ui-sidebar__brand-name')).toBeNull();
    // Los iconos siguen visibles.
    expect(fixture.nativeElement.querySelector('.ui-sidebar__icon')).not.toBeNull();
  });

  it('Analítica filtra sus hijos por seccion', () => {
    const onlyPre = setup(['PREANALITICA'], []);
    const core = onlyPre.visibleSections().find((s) => s.label === 'Core clínico');
    const analitica = core?.items.find((i) => i.label === 'Analítica');
    expect(analitica?.kind).toBe('expandable');
    if (analitica?.kind === 'expandable') {
      expect(analitica.children.map((c) => c.label)).toEqual(['Pre-analítica']);
    }
  });
});
