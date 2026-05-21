import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { SKIP_AUTH } from '@features/turnos/services/public-display.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Public endpoints opt-out via HttpContext (e.g. display TV snapshot).
  if (req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const tokens = inject(TokenService);
  const userSession = inject(UserSessionService);
  const router = inject(Router);
  const token = tokens.getToken();

  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
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
