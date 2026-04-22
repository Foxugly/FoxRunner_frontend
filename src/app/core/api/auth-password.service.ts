import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { UserRead } from './types';

@Injectable({ providedIn: 'root' })
export class AuthPasswordService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  forgot(email: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(`${this.base}/auth/forgot-password`, { email }),
    );
  }

  reset(token: string, password: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(`${this.base}/auth/reset-password`, { token, password }),
    );
  }

  register(email: string, password: string): Promise<UserRead> {
    return firstValueFrom(
      this.http.post<UserRead>(`${this.base}/auth/register`, { email, password }),
    );
  }
}
