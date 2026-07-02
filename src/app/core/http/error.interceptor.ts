import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, from, switchMap, tap, throwError } from 'rxjs';
import type { ApiError } from '../api/types';
import { AuthService } from '../auth/auth.service';
import { NetworkHealthService } from './network-health.service';

// Module-level: one in-flight refresh shared by all concurrent 401s so we hit
// /auth/jwt/refresh exactly once even when several requests fail together.
let refreshInFlight: Promise<string> | null = null;

function sharedRefresh(auth: AuthService): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = auth.refresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { code?: unknown }).code === 'string' &&
    typeof (body as { message?: unknown }).message === 'string'
  );
}

/** Human, non-technical toast titles per HTTP status. */
const FRIENDLY_TITLES: Record<number, string> = {
  0: 'Problème de connexion',
  400: 'Requête invalide',
  401: 'Session expirée',
  403: 'Accès refusé',
  404: 'Introuvable',
  408: 'Délai dépassé',
  409: 'Conflit',
  422: 'Données invalides',
  429: 'Trop de requêtes',
};

function friendlyTitle(status: number): string {
  if (status >= 500) return 'Erreur serveur';
  return FRIENDLY_TITLES[status] ?? 'Une erreur est survenue';
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
      const apiError = isApiError(err.error) ? err.error : null;
      const apiMessage = apiError?.message ?? null;
      const apiCode = apiError?.code ?? `http_${err.status}`;

      // The login screen owns its own inline messaging, so a failed sign-in must
      // NOT redirect and must NOT raise a generic toast.
      const isLoginAttempt = req.url.includes('/auth/jwt/login');
      const isAuthEndpoint =
        req.url.includes('/auth/jwt/login') || req.url.includes('/auth/jwt/refresh');

      // On a 401 for a normal request, try a single shared refresh and replay
      // the request with the fresh access token before giving up.
      if (err.status === 401 && !isAuthEndpoint && auth.hasStoredRefresh()) {
        return from(sharedRefresh(auth)).pipe(
          switchMap((access) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${access}` } })),
          ),
          catchError(() => {
            auth.clear();
            router.navigate(['/login']);
            return throwError(() => err);
          }),
        );
      }

      if (err.status === 401 && !isAuthEndpoint) {
        auth.clear();
        router.navigate(['/login']);
      }

      if (!isLoginAttempt) {
        const severity: 'error' | 'warn' | 'info' =
          err.status >= 500 ? 'error' : err.status >= 400 ? 'warn' : 'info';
        messages.add({
          severity,
          summary: friendlyTitle(err.status),
          detail: apiMessage ?? 'Réessaie dans un instant.',
          life: 8000,
          sticky: err.status >= 500,
        });
      }

      // The correlation id stays in the console for support — never in the user's face.
      console.error('[API error]', apiCode, apiMessage ?? err.message, reqId ? `X-Request-ID: ${reqId}` : '');

      return throwError(() => err);
    }),
  );
};
