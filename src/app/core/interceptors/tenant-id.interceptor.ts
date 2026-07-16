import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '@core/auth/token.service';

export const tenantIdInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantId = inject(TokenService).getTenantId();
  if (!tenantId) return next(req);
  return next(req.clone({ setHeaders: { 'X-Tenant-ID': tenantId } }));
};
