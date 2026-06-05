import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

/**
 * Guard de routing por rol. Variante `CanMatchFn` para que la ruta directamente
 * NO matchee si el usuario no tiene rol — útil para evitar `loadComponent`
 * innecesarios y para que el sidebar no resuelva la URL.
 *
 * Si ninguno de los `roles` está en el JWT, redirige a `/`.
 */
export const hasRoleGuard = (roles: string[]): CanMatchFn =>
  () => {
    const userRoles = inject(TokenService).getRoles();
    if (roles.some((r) => userRoles.includes(r))) return true;
    return inject(Router).createUrlTree(['/']);
  };
