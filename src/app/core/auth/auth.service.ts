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
  refresh_token: string;
  token_type: string;
}

interface RefreshResponse {
  access: string;
  refresh: string;
}

const REFRESH_KEY = 'fox.refresh';
const REMEMBER_KEY = 'fox.remember';

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

  private setRemember(remember: boolean): void {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  }

  private persistRefresh(refresh: string): void {
    // Write to the chosen store; clear the other so only one copy exists.
    const remember = localStorage.getItem(REMEMBER_KEY) === '1';
    (remember ? localStorage : sessionStorage).setItem(REFRESH_KEY, refresh);
    (remember ? sessionStorage : localStorage).removeItem(REFRESH_KEY);
  }

  private readRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY);
  }

  hasStoredRefresh(): boolean {
    return this.readRefresh() !== null;
  }

  async login(email: string, password: string, remember: boolean): Promise<void> {
    const body = new HttpParams({ fromObject: { username: email, password } });
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/jwt/login`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );
    this.setRemember(remember);
    this._token.set(res.access_token);
    this.persistRefresh(res.refresh_token);
    await this.refreshCurrentUser();
  }

  async loginWithToken(accessToken: string, refreshToken: string, remember = true): Promise<void> {
    this.setRemember(remember);
    this._token.set(accessToken);
    this.persistRefresh(refreshToken);
    await this.refreshCurrentUser();
  }

  /** Exchange the stored refresh for a new access; persist the rotated refresh. */
  async refresh(): Promise<string> {
    const refresh = this.readRefresh();
    if (!refresh) throw new Error('no refresh token');
    const res = await firstValueFrom(
      this.http.post<RefreshResponse>(`${environment.apiBaseUrl}/auth/jwt/refresh`, { refresh }),
    );
    this._token.set(res.access);
    this.persistRefresh(res.refresh);
    return res.access;
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
    const refresh = this.readRefresh();
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/auth/jwt/logout`, { refresh }),
      );
    } catch {
      // Backend might reject an expired token; we still clear locally.
    }
    this.clear();
    this.router.navigate(['/login']);
  }

  clear(): void {
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  }
}
