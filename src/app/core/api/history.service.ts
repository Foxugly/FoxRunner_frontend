import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toHttpParams } from './api-base';
import type { History, Paginated } from './types';

export interface HistoryParams {
  status?: string;
  slot_id?: string;
  scenario_id?: string;
  execution_id?: string;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(userId: string, params: HistoryParams = {}): Promise<Paginated<History>> {
    return firstValueFrom(
      this.http.get<Paginated<History>>(
        `${this.base}/users/${encodeURIComponent(userId)}/history`,
        { params: toHttpParams({ ...params }) },
      ),
    );
  }
}
