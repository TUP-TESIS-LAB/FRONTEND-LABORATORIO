import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

export const guestGuard: CanActivateFn = () => {
  const tokens = inject(TokenService);
  const router = inject(Router);
  if (!tokens.isTokenValid()) return true;
  return router.createUrlTree(['/']);
};
