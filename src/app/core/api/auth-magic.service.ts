import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface MagicExchangeResponse {
  access_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthMagicService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  request(email: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/auth/magic-link/request`, { email }));
  }

  exchange(token: string): Promise<MagicExchangeResponse> {
    return firstValueFrom(
      this.http.post<MagicExchangeResponse>(`${this.base}/auth/magic-link/exchange`, { token }),
    );
  }
}
