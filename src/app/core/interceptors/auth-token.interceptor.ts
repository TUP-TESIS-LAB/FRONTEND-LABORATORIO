import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '@core/auth/token.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const router = inject(Router);
  const token = tokens.getToken();

  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        tokens.removeToken();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
