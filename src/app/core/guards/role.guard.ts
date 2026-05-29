import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

export const roleGuard = (required: string): CanMatchFn =>
  () => {
    const roles = inject(TokenService).getRoles();
    if (roles.includes(required)) return true;
    return inject(Router).createUrlTree(['/']);
  };
