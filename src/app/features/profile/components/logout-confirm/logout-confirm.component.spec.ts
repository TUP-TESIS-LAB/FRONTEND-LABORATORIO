import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';
import { clearMySections } from '@core/access/store/access.actions';
import { BoxOccupationService } from '@features/turnos/box-occupation/services/box-occupation.service';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { LogoutConfirmComponent } from './logout-confirm.component';

describe('LogoutConfirmComponent', () => {
  let fixture: ComponentFixture<LogoutConfirmComponent>;
  let profileMenu: ProfileMenuService;

  const tokenStub = { removeToken: () => {} };
  const userSessionStub = { clear: () => {} };
  // Stub: no branch set, so release is skipped.
  const branchContextStub = { branchId: () => null };
  const boxOccupationStub = { release: () => of(undefined) };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LogoutConfirmComponent],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: {} }),
        { provide: TokenService, useValue: tokenStub },
        { provide: UserSessionService, useValue: userSessionStub },
        { provide: BoxOccupationService, useValue: boxOccupationStub },
        { provide: OperatorBranchContextService, useValue: branchContextStub },
      ],
    });
    fixture = TestBed.createComponent(LogoutConfirmComponent);
    profileMenu = TestBed.inject(ProfileMenuService);
    fixture.detectChanges();
  });

  it('reflects logoutConfirmOpen signal as the dialog visibility', () => {
    const comp = fixture.componentInstance as any;
    expect(comp.visible()).toBe(false);
    profileMenu.openLogoutConfirm();
    expect(comp.visible()).toBe(true);
  });

  it('cancel only closes the dialog, never touching token/session/router', () => {
    profileMenu.openLogoutConfirm();
    const comp = fixture.componentInstance as any;
    const removeSpy = vi.spyOn(tokenStub, 'removeToken');
    const clearSpy = vi.spyOn(userSessionStub, 'clear');
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    comp.cancel();

    expect(profileMenu.logoutConfirmOpen()).toBe(false);
    expect(removeSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('confirm clears token + user, closes dialog, and navigates to /login', async () => {
    profileMenu.openLogoutConfirm();
    const comp = fixture.componentInstance as any;
    const removeSpy = vi.spyOn(tokenStub, 'removeToken');
    const clearSpy = vi.spyOn(userSessionStub, 'clear');
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const dispatchSpy = vi.spyOn(TestBed.inject(MockStore), 'dispatch');

    // confirm() is now synchronous; doActualLogout() runs async via void.
    // branchContext stub returns null so no release detour — flush microtasks.
    comp.confirm();
    await Promise.resolve();

    expect(removeSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith(clearMySections());
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(profileMenu.logoutConfirmOpen()).toBe(false);
  });
});
