import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';
import { Role } from '@core/models/role.model';

export const rootGuard: CanActivateFn = () => {
  const roles = inject(TokenService).getPayload()?.roles ?? [];
  if (roles.includes(Role.Admin)) return true;
  return inject(Router).createUrlTree(['/']);
};
