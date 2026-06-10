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

  it('agrupa las pantallas externas en el desplegable "Pantallas en sala" (TV sala, TV extracción, Tótem), todas external', () => {
    const s = setup([], []);
    const core = s.visibleSections().find((sec) => sec.label === 'Core clínico');
    const grupo = core?.items.find((i) => i.label === 'Pantallas en sala');
    expect(grupo?.kind).toBe('expandable');
    if (grupo?.kind === 'expandable') {
      expect(grupo.children.map((c) => c.label)).toEqual(['TV sala de espera', 'TV extracción', 'Tótem']);
      expect(grupo.children.every((c) => c.external === true)).toBe(true);
    }
    // Ya no existen como items sueltos con chip "Smoke".
    const allLabels = core?.items.map((i) => i.label) ?? [];
    expect(allLabels).not.toContain('TV sala de espera');
  });

  it('los hijos de "Pantallas en sala" tienen icono (desktop/mobile) en lugar de puntito', () => {
    const s = setup([], []);
    const core = s.visibleSections().find((sec) => sec.label === 'Core clínico');
    const grupo = core?.items.find((i) => i.label === 'Pantallas en sala');
    if (grupo?.kind === 'expandable') {
      expect(grupo.children.map((c) => c.icon)).toEqual([
        'pi pi-desktop', 'pi pi-desktop', 'pi pi-mobile',
      ]);
    }
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
