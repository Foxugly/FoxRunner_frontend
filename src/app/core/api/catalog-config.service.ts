import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CatalogConfig, CatalogConfigUpdate } from './types';

/**
 * Global catalogue configuration (the ``data`` block of scenarios.json:
 * pushovers, networks, defaults). Superuser-only on the backend; pushover
 * ``token`` / ``user_key`` come back masked and are write-only on update.
 */
@Injectable({ providedIn: 'root' })
export class CatalogConfigService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  get(): Promise<CatalogConfig> {
    return firstValueFrom(this.http.get<CatalogConfig>(`${this.base}/catalog/config`));
  }

  update(dto: CatalogConfigUpdate): Promise<CatalogConfig> {
    return firstValueFrom(this.http.put<CatalogConfig>(`${this.base}/catalog/config`, dto));
  }
}
