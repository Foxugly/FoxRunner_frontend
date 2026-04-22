import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClientConfig {
  api_version: string;
  environment: string;
  default_timezone: string;
  features: Record<string, boolean>;
}

@Injectable({ providedIn: 'root' })
export class ClientConfigService {
  private readonly http = inject(HttpClient);
  private readonly _config = signal<ClientConfig | null>(null);
  readonly config = this._config.asReadonly();

  async load(): Promise<void> {
    try {
      const cfg = await firstValueFrom(
        this.http.get<ClientConfig>(`${environment.apiBaseUrl}/config/client`),
      );
      this._config.set(cfg);
    } catch {
      // Bootstrapping must not block the app; defaults in environment.ts apply.
    }
  }
}
