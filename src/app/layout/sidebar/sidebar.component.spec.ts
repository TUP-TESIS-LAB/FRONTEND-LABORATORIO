import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SidebarComponent } from './sidebar.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { AccessRegistry } from '@core/access/access-registry';
import { TokenService } from '@core/auth/token.service';

describe('SidebarComponent visibility', () => {
  function setup(sections: string[], roles: string[]) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockStore({ initialState: {} }),
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
