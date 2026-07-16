import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSessionService } from '@features/profile/services/user-session.service';

const WRITE_ROLES = ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'] as const;

export const agendaWriteGuard: CanActivateFn = () => {
  const session = inject(UserSessionService);
  const router = inject(Router);

  const roles = session.currentUser()?.roles?.map(r => r.code) ?? [];
  if (roles.some(r => (WRITE_ROLES as readonly string[]).includes(r))) {
    return true;
  }
  router.navigate(['/turnos/configuracion']);
  return false;
};
