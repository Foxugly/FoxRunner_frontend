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

  prune(olderThanDays = 30): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${this.base}/artifacts`, {
        params: toHttpParams({ older_than_days: olderThanDays }),
      }),
    );
  }
}
