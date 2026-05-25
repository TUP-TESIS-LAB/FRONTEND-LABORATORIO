import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSessionService } from '@features/profile/services/user-session.service';

const ALLOWED = ['SECRETARIA', 'ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'];

export const recepcionAccessGuard: CanActivateFn = () => {
  const session = inject(UserSessionService);
  const router = inject(Router);

  const roles = session.currentUser()?.roles?.map(r => r.code) ?? [];
  if (roles.some(r => ALLOWED.includes(r))) return true;

  router.navigate(['/home']);
  return false;
};
