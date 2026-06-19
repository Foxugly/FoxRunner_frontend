import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toHttpParams } from './api-base';
import type { Artifact, Paginated } from './types';

export interface ArtifactsParams {
  kind?: 'screenshots' | 'pages';
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class ArtifactsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(params: ArtifactsParams = {}): Promise<Paginated<Artifact>> {
    return firstValueFrom(
      this.http.get<Paginated<Artifact>>(`${this.base}/artifacts`, {
        params: toHttpParams({ ...params }),
      }),
    );
  }

  downloadUrl(kind: string, name: string): string {
    return `${this.base}/artifacts/${encodeURIComponent(kind)}/${encodeURIComponent(name)}`;
  }

  /** Fetch an artifact as an authenticated blob (carries the JWT via the interceptor). */
  async downloadBlob(kind: string, name: string): Promise<string> {
    const blob = await firstValueFrom(
      this.http.get(this.downloadUrl(kind, name), { responseType: 'blob' }),
    );
    return URL.createObjectURL(blob);
  }

  prune(olderThanDays = 30): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${this.base}/artifacts`, {
        params: toHttpParams({ older_than_days: olderThanDays }),
      }),
    );
  }
}
