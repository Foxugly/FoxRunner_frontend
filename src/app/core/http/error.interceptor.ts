import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NetworkHealthService } from './network-health.service';

interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messages = inject(MessageService);
  const auth = inject(AuthService);
  const router = inject(Router);
  const health = inject(NetworkHealthService);

  return next(req).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response) health.reportSuccess();
    }),
    catchError((err: HttpErrorResponse) => {
      health.reportFailure(err.status);
      const reqId = err.headers?.get('X-Request-ID') ?? req.headers.get('X-Request-ID') ?? null;
      const body =
        err.error && typeof err.error === 'object' ? (err.error as ApiErrorBody) : null;
      const apiMessage = body?.message ?? err.message ?? 'Erreur inconnue.';
      const apiCode = body?.code ?? `http_${err.status}`;

      if (err.status === 401 && !req.url.includes('/auth/jwt/login')) {
        auth.clear();
        router.navigate(['/login']);
      }

      const severity: 'error' | 'warn' | 'info' =
        err.status >= 500 ? 'error' : err.status >= 400 ? 'warn' : 'info';
      const suffix = reqId ? `\nRequest-ID: ${reqId}` : '';
      messages.add({
        severity,
        summary: apiCode,
        detail: `${apiMessage}${suffix}`,
        life: 8000,
        sticky: err.status >= 500,
      });

      if (reqId) {
        console.error('[API error]', apiCode, apiMessage, 'X-Request-ID:', reqId);
      } else {
        console.error('[API error]', apiCode, apiMessage);
      }

      return throwError(() => err);
    }),
  );
};
