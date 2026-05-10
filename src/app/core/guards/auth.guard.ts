import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

export const authGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  if (tokenService.isTokenValid()) return true;
  return inject(Router).createUrlTree(['/login']);
};
