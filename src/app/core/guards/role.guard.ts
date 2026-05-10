import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

export const roleGuard = (requiredRole: string): CanActivateFn =>
  () => {
    const roles = inject(TokenService).getPayload()?.roles ?? [];
    if (roles.includes(requiredRole)) return true;
    return inject(Router).createUrlTree(['/']);
  };
