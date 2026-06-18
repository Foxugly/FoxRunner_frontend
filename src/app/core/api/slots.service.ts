import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { idempotencyHeaders, toHttpParams } from './api-base';
import type { Paginated, Slot, SlotSummary, SlotUpdate } from './types';

export interface SlotListParams {
  scenario_id?: string;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class SlotsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(params: SlotListParams = {}): Promise<Paginated<SlotSummary>> {
    return firstValueFrom(
      this.http.get<Paginated<SlotSummary>>(`${this.base}/slots`, {
        params: toHttpParams({ ...params }),
      }),
    );
  }

  /** Slots belonging to a single scenario (server-side `scenario_id` filter). */
  async listForScenario(scenarioId: string): Promise<SlotSummary[]> {
    const page = await this.list({ scenario_id: scenarioId, limit: 500, offset: 0 });
    return page.items;
  }

  get(slotId: string): Promise<Slot> {
    return firstValueFrom(
      this.http.get<Slot>(`${this.base}/slots/${encodeURIComponent(slotId)}`),
    );
  }

  create(dto: Slot, idempotencyKey?: string): Promise<Slot> {
    const headers = idempotencyHeaders(idempotencyKey);
    return firstValueFrom(
      this.http.post<Slot>(`${this.base}/slots`, dto, headers ? { headers } : {}),
    );
  }

  patch(slotId: string, dto: SlotUpdate): Promise<Slot> {
    return firstValueFrom(
      this.http.patch<Slot>(`${this.base}/slots/${encodeURIComponent(slotId)}`, dto),
    );
  }

  remove(slotId: string): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${this.base}/slots/${encodeURIComponent(slotId)}`),
    );
  }
}
