import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CurrentUser {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  timezone_name: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<CurrentUser | null>(null);

  readonly token = this._token.asReadonly();
  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._token() !== null && this._user() !== null);
  readonly isSuperuser = computed(() => this._user()?.is_superuser ?? false);

  async login(email: string, password: string): Promise<void> {
    const body = new HttpParams({ fromObject: { username: email, password } });
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(
        `${environment.apiBaseUrl}/auth/jwt/login`,
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );
    this._token.set(res.access_token);
    await this.refreshCurrentUser();
  }

  async loginWithToken(accessToken: string): Promise<void> {
    this._token.set(accessToken);
    await this.refreshCurrentUser();
  }

  async refreshCurrentUser(): Promise<void> {
    const user = await firstValueFrom(
      this.http.get<CurrentUser>(`${environment.apiBaseUrl}/users/me`),
    );
    this._user.set(user);
  }

  async updateTimezone(timezoneName: string): Promise<void> {
    const user = await firstValueFrom(
      this.http.patch<CurrentUser>(`${environment.apiBaseUrl}/users/me`, {
        timezone_name: timezoneName,
      }),
    );
    this._user.set(user);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${environment.apiBaseUrl}/auth/jwt/logout`, {}));
    } catch {
      // Backend might 401 on expired tokens; we still clear locally.
    }
    this.clear();
    this.router.navigate(['/login']);
  }

  clear(): void {
    this._token.set(null);
    this._user.set(null);
  }
}
