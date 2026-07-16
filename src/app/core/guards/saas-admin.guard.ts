import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

export const saasAdminGuard: CanActivateFn = () => {
  const tokens = inject(TokenService);
  const router = inject(Router);
  if (!tokens.isTokenValid()) return router.createUrlTree(['/saas/login']);
  if (!tokens.getRoles().includes('SAAS_ADMIN')) return router.createUrlTree(['/saas/login']);
  return true;
};
