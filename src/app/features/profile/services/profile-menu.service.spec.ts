import { TestBed } from '@angular/core/testing';
import { ProfileMenuService } from './profile-menu.service';

describe('ProfileMenuService', () => {
  let service: ProfileMenuService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfileMenuService);
  });

  it('starts with both overlays closed', () => {
    expect(service.passwordDrawerOpen()).toBe(false);
    expect(service.logoutConfirmOpen()).toBe(false);
  });

  it('opens and closes the password drawer', () => {
    service.openPasswordDrawer();
    expect(service.passwordDrawerOpen()).toBe(true);
    service.closePasswordDrawer();
    expect(service.passwordDrawerOpen()).toBe(false);
  });

  it('opens and closes the logout confirm', () => {
    service.openLogoutConfirm();
    expect(service.logoutConfirmOpen()).toBe(true);
    service.closeLogoutConfirm();
    expect(service.logoutConfirmOpen()).toBe(false);
  });

  it('keeps the two overlays independent', () => {
    service.openPasswordDrawer();
    service.openLogoutConfirm();
    expect(service.passwordDrawerOpen()).toBe(true);
    expect(service.logoutConfirmOpen()).toBe(true);
    service.closePasswordDrawer();
    expect(service.passwordDrawerOpen()).toBe(false);
    expect(service.logoutConfirmOpen()).toBe(true);
  });
});
