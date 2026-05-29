import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export function toApiError(err: unknown): ApiErrorResponse {
  if (err instanceof HttpErrorResponse) {
    const body = err.error ?? {};
    return {
      code: body.code ?? `HTTP_${err.status}`,
      message: body.message ?? err.message,
      fieldErrors: body.fieldErrors,
    };
  }
  return { code: 'UNKNOWN', message: String(err) };
}
