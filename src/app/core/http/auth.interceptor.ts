import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const setHeaders: Record<string, string> = {};
  if (token && !req.headers.has('Authorization')) {
    setHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (!req.headers.has('X-Request-ID')) {
    setHeaders['X-Request-ID'] = crypto.randomUUID();
  }
  return next(Object.keys(setHeaders).length ? req.clone({ setHeaders }) : req);
};
