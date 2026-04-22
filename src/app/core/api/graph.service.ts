import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toHttpParams } from './api-base';
import type {
  GraphNotification,
  GraphRenew,
  GraphSubscription,
  GraphSubscriptionCreate,
  Paginated,
} from './types';

@Injectable({ providedIn: 'root' })
export class GraphService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listSubscriptions(limit = 50, offset = 0): Promise<Paginated<GraphSubscription>> {
    return firstValueFrom(
      this.http.get<Paginated<GraphSubscription>>(`${this.base}/graph/subscriptions`, {
        params: toHttpParams({ limit, offset }),
      }),
    );
  }

  createSubscription(dto: GraphSubscriptionCreate): Promise<GraphSubscription> {
    return firstValueFrom(
      this.http.post<GraphSubscription>(`${this.base}/graph/subscriptions`, dto),
    );
  }

  renewSubscription(id: string, dto: GraphRenew): Promise<GraphSubscription> {
    return firstValueFrom(
      this.http.patch<GraphSubscription>(
        `${this.base}/graph/subscriptions/${encodeURIComponent(id)}`,
        dto,
      ),
    );
  }

  deleteSubscription(id: string): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${this.base}/graph/subscriptions/${encodeURIComponent(id)}`),
    );
  }

  listNotifications(limit = 50, offset = 0): Promise<Paginated<GraphNotification>> {
    return firstValueFrom(
      this.http.get<Paginated<GraphNotification>>(`${this.base}/graph/notifications`, {
        params: toHttpParams({ limit, offset }),
      }),
    );
  }
}
