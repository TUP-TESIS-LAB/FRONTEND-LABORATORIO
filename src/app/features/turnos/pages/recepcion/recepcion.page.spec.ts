import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { EMPTY } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { RecepcionPage } from './recepcion.page';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { initialBranchTotemConfigState } from '../../store/branch-totem-config/branch-totem-config.state';
import { BOX_OCCUPATION_FEATURE_KEY, initialBoxOccupationState } from '../../box-occupation/store/box-occupation.state';
import { initialQueueState } from '../../store/queue/queue.state';
import { initialAppointmentsState } from '../../store/appointments/appointments.state';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { TokenService } from '@core/auth/token.service';
import { SucursalService } from '@features/sucursales/services/sucursal.service';
import { OperatorBranchContextService } from '../../services/operator-branch.context';
import { URGENT_PENDING_FEATURE_KEY, initialUrgentPendingState } from '@features/analitica/store/urgent-pending/urgent-pending.state';
import { ATENCION_FEATURE_KEY, initialAtencionState } from '@features/analitica/store/atencion/atencion.state';
import { PollingService } from '@core/refresh';

/** Stub de PollingService para evitar timers reales. */
const pollingStub = {
  startPolling: vi.fn(() => ({ stop: vi.fn(), pokeNow: vi.fn(), setActive: vi.fn() })),
};

/** PrimeNG TabList usa ResizeObserver — jsdom no lo implementa: lo stubeamos. */
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/** Stub minimal de ModuleRegistry */
function registryStub(urgenciasActive: boolean) {
  return {
    isActive: (key: ModuleKey) => key === ModuleKey.Urgencias ? urgenciasActive : false,
  };
}

function setup(urgenciasActive: boolean) {
  TestBed.configureTestingModule({
    imports: [RecepcionPage],
    providers: [
      provideMockStore({
        initialState: {
          branchTotemConfig: initialBranchTotemConfigState,
          [BOX_OCCUPATION_FEATURE_KEY]: initialBoxOccupationState,
          [URGENT_PENDING_FEATURE_KEY]: initialUrgentPendingState,
          [ATENCION_FEATURE_KEY]: initialAtencionState,
          queue: initialQueueState,
          appointments: initialAppointmentsState,
        },
      }),
      provideMockActions(() => EMPTY),
      provideRouter([]),
      provideNoopAnimations(),
      { provide: ModuleRegistry, useValue: registryStub(urgenciasActive) },
      { provide: UserSessionService, useValue: { currentUser: () => ({ id: 1, branch: 1 }) } },
      { provide: TokenService, useValue: { getUserId: () => 1 } },
      { provide: SucursalService, useValue: { getById: () => ({ subscribe: () => {} }) } },
      { provide: OperatorBranchContextService, useValue: {
          branchId: () => 1,
          setBranchId: () => {},
        }
      },
      MessageService,
      { provide: PollingService, useValue: pollingStub },
    ],
  });
  const fixture = TestBed.createComponent(RecepcionPage);
  fixture.detectChanges();
  return fixture;
}

describe('RecepcionPage — tab Urgentes', () => {
  it('NO renderiza la tab Urgentes si el modulo esta inactivo', () => {
    const fixture = setup(false);
    const tabLabels = fixture.nativeElement.querySelectorAll('p-tab');
    const texts = Array.from(tabLabels).map((el: any) => el.textContent?.trim());
    expect(texts).not.toContain('Urgentes');
  });

  it('renderiza la tab Urgentes si el modulo esta activo', () => {
    const fixture = setup(true);
    const tabLabels = fixture.nativeElement.querySelectorAll('p-tab');
    const texts = Array.from(tabLabels).map((el: any) => el.textContent?.trim());
    expect(texts).toContain('Urgentes');
  });

  it('renderiza la tabpanel Urgentes si el modulo esta activo', () => {
    const fixture = setup(true);
    const panels = fixture.nativeElement.querySelectorAll('p-tabpanel');
    const attrs = Array.from(panels).map((el: any) => el.getAttribute('value'));
    expect(attrs).toContain('urgentes');
  });

  it('NO renderiza la tabpanel Urgentes si el modulo esta inactivo', () => {
    const fixture = setup(false);
    const panels = fixture.nativeElement.querySelectorAll('p-tabpanel');
    const attrs = Array.from(panels).map((el: any) => el.getAttribute('value'));
    expect(attrs).not.toContain('urgentes');
  });
});
