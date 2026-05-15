import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

export const guestGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  if (!tokenService.isTokenValid()) return true;
  return router.createUrlTree(['/']);
};
