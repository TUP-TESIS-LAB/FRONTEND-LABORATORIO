import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { agendaWriteGuard } from './agenda-write.guard';

describe('agendaWriteGuard', () => {
  let userSession: { currentUser: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    userSession = { currentUser: vi.fn() };
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: UserSessionService, useValue: userSession },
        { provide: Router, useValue: router },
      ],
    });
  });

  function runGuard(): boolean {
    return TestBed.runInInjectionContext(() =>
      (agendaWriteGuard as any)({} as any, {} as any)
    ) as boolean;
  }

  it('returns true for ADMINISTRADOR', () => {
    userSession.currentUser.mockReturnValue({
      roles: [{ id: 1, code: 'ADMINISTRADOR', description: '', hierarchy: 1 }],
    });
    expect(runGuard()).toBe(true);
  });

  it('returns true for RESPONSABLE_SECRETARIA', () => {
    userSession.currentUser.mockReturnValue({
      roles: [{ id: 2, code: 'RESPONSABLE_SECRETARIA', description: '', hierarchy: 2 }],
    });
    expect(runGuard()).toBe(true);
  });

  it('returns false and navigates to /turnos/configuracion for SECRETARIA', () => {
    userSession.currentUser.mockReturnValue({
      roles: [{ id: 3, code: 'SECRETARIA', description: '', hierarchy: 3 }],
    });
    expect(runGuard()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/turnos/configuracion']);
  });

  it('returns false and navigates to /turnos/configuracion for unauthenticated', () => {
    userSession.currentUser.mockReturnValue(null);
    expect(runGuard()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/turnos/configuracion']);
  });
});
