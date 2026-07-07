import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TopbarComponent } from './topbar.component';
import { NavAccessService } from '@core/nav/nav-access.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { signal } from '@angular/core';

const ENTRIES = [
  { label: 'Recepción', path: '/turnos/recepcion', icon: 'pi pi-bell', sectionLabel: 'Recepción' },
  { label: 'Pacientes', path: '/pacientes', icon: 'pi pi-address-book', sectionLabel: 'Recepción' },
];

describe('TopbarComponent — búsqueda global', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [TopbarComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideHttpClient(),
        provideMockStore({ initialState: {} }),
        { provide: NavAccessService, useValue: { searchableEntries: () => ENTRIES } },
        { provide: UserSessionService, useValue: { currentUser: () => null } },
        {
          provide: OperatorBranchContextService,
          useValue: { branchName: signal(null).asReadonly(), branchId: signal(null).asReadonly() },
        },
      ],
    });
    const fixture = TestBed.createComponent(TopbarComponent);
    const router = TestBed.inject(Router);
    return { fixture, cmp: fixture.componentInstance, router };
  }

  it('onComplete filtra por label (case-insensitive) sobre las entradas ya permitidas', () => {
    const { cmp } = setup();
    cmp['onComplete']({ query: 'pacien' } as any);
    expect(cmp['suggestions']().map((e: any) => e.label)).toEqual(['Pacientes']);
  });

  it('onComplete vacía las sugerencias cuando el query está vacío', () => {
    const { cmp } = setup();
    cmp['onComplete']({ query: 'pacien' } as any);
    cmp['onComplete']({ query: '' } as any);
    expect(cmp['suggestions']()).toEqual([]);
  });

  it('onSelect navega a la ruta de la entrada elegida', () => {
    const { cmp, router } = setup();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    cmp['onSelect']({ value: ENTRIES[1] } as any);
    expect(navigateSpy).toHaveBeenCalledWith('/pacientes');
  });
});
