import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { TENANT_FEATURE_KEY } from '@core/tenant/store/tenant.state';
import { TokenService } from '@core/auth/token.service';
import { UserResponse } from '@features/auth/models/auth.models';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';
import { ProfileMenuComponent } from './profile-menu.component';

const mockUser: UserResponse = {
  id: 1, firstName: 'Ana', lastName: 'Pérez', username: 'ana', email: 'a@b.com',
  phone: null, document: null, isEmailVerified: true, isExternal: false,
  branch: null, isFirstLogin: false, active: true,
  roles: [{ id: 1, code: 'ADMINISTRADOR', description: 'Administrador', hierarchy: 0 }],
};

describe('ProfileMenuComponent', () => {
  let fixture: ComponentFixture<ProfileMenuComponent>;
  let userSession: UserSessionService;
  let profileMenu: ProfileMenuService;

  function configure(initialUser: UserResponse | null, tenantName: string | null) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProfileMenuComponent],
      providers: [
        provideMockStore({
          initialState: {
            [TENANT_FEATURE_KEY]: {
              config: tenantName
                ? { id: 'lab1', name: tenantName, logoUrl: '', primaryColor: '#000', secondaryColor: '#000', modules: [] }
                : null,
              pending: false,
              error: null,
            },
          },
        }),
      ],
    });
    fixture = TestBed.createComponent(ProfileMenuComponent);
    userSession = TestBed.inject(UserSessionService);
    profileMenu = TestBed.inject(ProfileMenuService);
    if (initialUser) userSession.set(initialUser);
    fixture.detectChanges();
  }

  afterEach(() => {
    localStorage.clear();
  });

  it('renders user info from UserSessionService', () => {
    configure(mockUser, 'Lab Central');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Ana Pérez');
    expect(root.textContent).toContain('a@b.com');
    expect(root.textContent).toContain('Administrador');
  });

  it('renders tenant name from the store', () => {
    configure(mockUser, 'Lab Central');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Lab Central');
  });

  it('falls back to the JWT sub when no user blob is set', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProfileMenuComponent],
      providers: [
        provideMockStore({
          initialState: {
            [TENANT_FEATURE_KEY]: { config: null, pending: false, error: null },
          },
        }),
      ],
    });
    const tokens = TestBed.inject(TokenService);
    vi.spyOn(tokens, 'getPayload').mockReturnValue({
      sub: 'admin',
      tenantId: 1,
      userId: 1,
      roles: ['ADMINISTRADOR'],
      isExternal: false,
      exp: 9999999999,
      iat: 1,
    });
    fixture = TestBed.createComponent(ProfileMenuComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance as any;
    expect(comp.fullName()).toBe('admin');
    expect(comp.initials()).toBe('AD');
  });

  it('opens the password drawer and emits close on "Cambiar contraseña" click', () => {
    configure(mockUser, 'Lab Central');
    const comp = fixture.componentInstance as any;
    const closeSpy = vi.fn();
    comp.close.subscribe(closeSpy);
    comp.onChangePasswordClick();
    expect(profileMenu.passwordDrawerOpen()).toBe(true);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('opens the logout confirm and emits close on "Cerrar sesión" click', () => {
    configure(mockUser, 'Lab Central');
    const comp = fixture.componentInstance as any;
    const closeSpy = vi.fn();
    comp.close.subscribe(closeSpy);
    comp.onLogoutClick();
    expect(profileMenu.logoutConfirmOpen()).toBe(true);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('disabled items do not trigger any service action', () => {
    configure(mockUser, 'Lab Central');
    const root = fixture.nativeElement as HTMLElement;
    const disabledButtons = Array.from(root.querySelectorAll('button[disabled]'));
    expect(disabledButtons.length).toBeGreaterThanOrEqual(3);
    disabledButtons.forEach(btn => (btn as HTMLButtonElement).click());
    expect(profileMenu.passwordDrawerOpen()).toBe(false);
    expect(profileMenu.logoutConfirmOpen()).toBe(false);
  });
});
