import { Injectable, signal } from '@angular/core';
import { UserResponse } from '@features/auth/models/auth.models';

const STORAGE_KEY = 'labcore_user';

@Injectable({ providedIn: 'root' })
export class UserSessionService {
  readonly currentUser = signal<UserResponse | null>(this.loadFromStorage());

  set(user: UserResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  get(): UserResponse | null {
    return this.currentUser();
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUser.set(null);
  }

  private loadFromStorage(): UserResponse | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as UserResponse) : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
