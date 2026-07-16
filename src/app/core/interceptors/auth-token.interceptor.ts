import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { SKIP_AUTH } from '@features/turnos/services/public-display.service';

/**
 * Endpoints públicos previos a la autenticación: login/registro/recupero. NO
 * deben llevar Authorization (un token viejo en storage haría que el filtro de
 * seguridad del back rechace con 401 antes de validar credenciales), y un 401
 * de estos endpoints es "credenciales inválidas" — lo maneja la pantalla, no
 * dispara el logout+redirect global.
 */
const PUBLIC_AUTH_PATH = /\/api\/v1\/auth\/(internal\/(login|password\/forgot)|external\/(login|register)|login-patient|reset-password|first-login\/(set-password-with-token|generate-token))/;

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Public endpoints opt-out via HttpContext (e.g. display TV snapshot).
  if (req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const tokens = inject(TokenService);
  const userSession = inject(UserSessionService);
  const router = inject(Router);

  const isPublicAuth = PUBLIC_AUTH_PATH.test(req.url);
  const token = tokens.getToken();

  // Solo adjuntamos un token VÁLIDO (no expirado) y nunca a endpoints públicos
  // de auth. Un token vencido en storage no sirve y, si se manda, envenena la
  // request (el back responde 401) — incluido el propio login.
  const authed = !isPublicAuth && token && tokens.isTokenValid()
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !isPublicAuth) {
        tokens.removeToken();
        userSession.clear();
        const inSaas = router.url === '/saas/login' || router.url.startsWith('/saas/');
        const target = inSaas ? '/saas/login' : '/login';
        router.navigate([target]);
      }
      return throwError(() => err);
    }),
  );
};
