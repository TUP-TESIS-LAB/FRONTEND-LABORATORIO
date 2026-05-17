import { TestBed } from '@angular/core/testing';
import { UserSessionService } from './user-session.service';
import { UserResponse } from '@features/auth/models/auth.models';

const STORAGE_KEY = 'labcore_user';

const mockUser: UserResponse = {
  id: 1,
  firstName: 'Ana',
  lastName: 'Pérez',
  username: 'ana',
  email: 'a@b.com',
  phone: null,
  document: null,
  isEmailVerified: true,
  isExternal: false,
  branch: null,
  isFirstLogin: false,
  active: true,
  roles: [{ id: 1, code: 'ADMINISTRADOR', description: 'Administrador', hierarchy: 0 }],
};

describe('UserSessionService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('returns null when localStorage is empty', () => {
    const service = TestBed.inject(UserSessionService);
    expect(service.currentUser()).toBeNull();
    expect(service.get()).toBeNull();
  });

  it('persists user to localStorage and updates the signal on set', () => {
    const service = TestBed.inject(UserSessionService);
    service.set(mockUser);
    expect(service.currentUser()).toEqual(mockUser);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(mockUser);
  });

  it('removes from localStorage and nulls the signal on clear', () => {
    const service = TestBed.inject(UserSessionService);
    service.set(mockUser);
    service.clear();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('seeds the signal from localStorage on construction', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    const service = TestBed.inject(UserSessionService);
    expect(service.currentUser()).toEqual(mockUser);
  });

  it('returns null and clears the key when localStorage has corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const service = TestBed.inject(UserSessionService);
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
