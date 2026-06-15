import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SidebarComponent } from './sidebar.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { AccessRegistry } from '@core/access/access-registry';
import { TokenService } from '@core/auth/token.service';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { UserSessionService } from '@features/profile/services/user-session.service';
import {
  selectBranchTotemEnabled,
  selectAtencionDisplayEnabled,
  selectExtraccionDisplayEnabled,
} from '@features/turnos/store/branch-totem-config/branch-totem-config.selectors';

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

  it('NO existe un item "Turnos" en el sidebar (se quitó; queda Configuración de agendas)', () => {
    const s = setup(['TURNOS'], ['ADMINISTRADOR']);
    const allLabels = s.visibleSections().flatMap((sec) => sec.items.map((i) => i.label));
    expect(allLabels).not.toContain('Turnos');
    expect(allLabels).toContain('Configuración de agendas');
  });

  it('muestra Recepción solo si la seccion TURNOS esta concedida', () => {
    const withTurnos = setup(['TURNOS'], []);
    const core = withTurnos.visibleSections().find((s) => s.label === 'Core clínico');
    expect(core?.items.some((i) => i.label === 'Recepción')).toBe(true);

    const withoutTurnos = setup([], []);
    const core2 = withoutTurnos.visibleSections().find((s) => s.label === 'Core clínico');
    expect(core2?.items.some((i) => i.label === 'Recepción') ?? false).toBe(false);
  });

  it('ya NO existe el desplegable hardcodeado "Pantallas en sala" en el nav', () => {
    const s = setup([], []);
    const allLabels = s.visibleSections().flatMap((sec) => sec.items.map((i) => i.label));
    expect(allLabels).not.toContain('Pantallas en sala');
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

  it('Muestras filtra sus hijos por seccion', () => {
    const onlyPre = setup(['PREANALITICA'], []);
    const core = onlyPre.visibleSections().find((s) => s.label === 'Core clínico');
    const muestras = core?.items.find((i) => i.label === 'Muestras');
    expect(muestras?.kind).toBe('expandable');
    if (muestras?.kind === 'expandable') {
      // PREANALITICA permite Recolección y Traslado
      expect(muestras.children.map((c) => c.label)).toEqual(['Recolección', 'Traslado']);
    }
  });

  it('Muestras muestra Descarte solo con POSTANALITICA', () => {
    const onlyPost = setup(['POSTANALITICA'], []);
    const core = onlyPost.visibleSections().find((s) => s.label === 'Core clínico');
    const muestras = core?.items.find((i) => i.label === 'Muestras');
    if (muestras?.kind === 'expandable') {
      expect(muestras.children.map((c) => c.label)).toEqual(['Descarte']);
    }
  });
});

describe('SidebarComponent — links de pantallas (gating dinámico)', () => {
  function setup(flags: { enabled: boolean; atencion: boolean; extraccion: boolean }) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockStore({
          initialState: {},
          selectors: [
            { selector: selectTenantConfig, value: null },
            { selector: selectBranchTotemEnabled, value: flags.enabled },
            { selector: selectAtencionDisplayEnabled, value: flags.atencion },
            { selector: selectExtraccionDisplayEnabled, value: flags.extraccion },
          ],
        }),
        { provide: ModuleRegistry, useValue: { isActive: () => true } },
        { provide: AccessRegistry, useValue: { has: () => true } },
        { provide: TokenService, useValue: { getRoles: () => [] } },
        { provide: UserSessionService, useValue: { currentUser: () => ({ branch: 1001, tenantSlug: 'lab-demo' }) } },
      ],
    });
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('solo atención ON → muestra solo "TV sala de espera" con la URL correcta', () => {
    const fixture = setup({ enabled: false, atencion: true, extraccion: false });
    const cmp = fixture.componentInstance as SidebarComponent;
    expect(cmp.tvSalaUrl()).toBe('/display/lab-demo/1001');
    expect(cmp.tvExtraccionUrl()).toBeNull();
    expect(cmp.totemUrl()).toBeNull();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.ui-sidebar__item .ui-sidebar__label'))
      .map((el) => (el as HTMLElement).textContent?.trim());
    expect(labels).toContain('TV sala de espera');
    expect(labels).not.toContain('TV extracción');
    expect(labels).not.toContain('Tótem');
  });

  it('solo extracción ON → muestra solo "TV extracción"', () => {
    const fixture = setup({ enabled: false, atencion: false, extraccion: true });
    const cmp = fixture.componentInstance as SidebarComponent;
    expect(cmp.tvExtraccionUrl()).toBe('/display/extraccion/lab-demo/1001');
    expect(cmp.tvSalaUrl()).toBeNull();
    expect(cmp.totemUrl()).toBeNull();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.ui-sidebar__item .ui-sidebar__label'))
      .map((el) => (el as HTMLElement).textContent?.trim());
    expect(labels).toContain('TV extracción');
    expect(labels).not.toContain('TV sala de espera');
  });

  it('tótem ON → muestra "Tótem" con /turnos/totem', () => {
    const fixture = setup({ enabled: true, atencion: false, extraccion: false });
    const cmp = fixture.componentInstance as SidebarComponent;
    expect(cmp.totemUrl()).toBe('/turnos/totem');
    expect(cmp.tvSalaUrl()).toBeNull();
    expect(cmp.tvExtraccionUrl()).toBeNull();
  });

  it('todo OFF → no muestra ningún link de pantallas', () => {
    const fixture = setup({ enabled: false, atencion: false, extraccion: false });
    const cmp = fixture.componentInstance as SidebarComponent;
    expect(cmp.tvSalaUrl()).toBeNull();
    expect(cmp.tvExtraccionUrl()).toBeNull();
    expect(cmp.totemUrl()).toBeNull();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.ui-sidebar__item .ui-sidebar__label'))
      .map((el) => (el as HTMLElement).textContent?.trim());
    expect(labels).not.toContain('TV sala de espera');
    expect(labels).not.toContain('TV extracción');
    expect(labels).not.toContain('Tótem');
  });
});
