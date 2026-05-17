import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ProfileMenuService {
  readonly passwordDrawerOpen = signal(false);
  readonly logoutConfirmOpen = signal(false);

  openPasswordDrawer(): void {
    this.passwordDrawerOpen.set(true);
  }

  closePasswordDrawer(): void {
    this.passwordDrawerOpen.set(false);
  }

  openLogoutConfirm(): void {
    this.logoutConfirmOpen.set(true);
  }

  closeLogoutConfirm(): void {
    this.logoutConfirmOpen.set(false);
  }
}
