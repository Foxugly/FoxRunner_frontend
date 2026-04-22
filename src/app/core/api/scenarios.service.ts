import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { idempotencyHeaders, toHttpParams } from './api-base';
import type {
  Paginated,
  RunResponse,
  ScenarioCreate,
  ScenarioDetail,
  ScenarioSummary,
  ScenarioUpdate,
  Share,
  ShareList,
  ShareResponse,
} from './types';

@Injectable({ providedIn: 'root' })
export class ScenariosService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(userId: string, limit = 50, offset = 0): Promise<Paginated<ScenarioSummary>> {
    const params = toHttpParams({ limit, offset });
    return firstValueFrom(
      this.http.get<Paginated<ScenarioSummary>>(
        `${this.base}/users/${encodeURIComponent(userId)}/scenarios`,
        { params },
      ),
    );
  }

  get(userId: string, scenarioId: string): Promise<ScenarioDetail> {
    return firstValueFrom(
      this.http.get<ScenarioDetail>(
        `${this.base}/users/${encodeURIComponent(userId)}/scenarios/${encodeURIComponent(scenarioId)}`,
      ),
    );
  }

  create(dto: ScenarioCreate, idempotencyKey?: string): Promise<ScenarioDetail> {
    const headers = idempotencyHeaders(idempotencyKey);
    return firstValueFrom(
      this.http.post<ScenarioDetail>(`${this.base}/scenarios`, dto, headers ? { headers } : {}),
    );
  }

  patch(scenarioId: string, dto: ScenarioUpdate): Promise<ScenarioDetail> {
    return firstValueFrom(
      this.http.patch<ScenarioDetail>(
        `${this.base}/scenarios/${encodeURIComponent(scenarioId)}`,
        dto,
      ),
    );
  }

  duplicate(scenarioId: string, newScenarioId: string): Promise<ScenarioDetail> {
    const params = toHttpParams({ new_scenario_id: newScenarioId });
    return firstValueFrom(
      this.http.post<ScenarioDetail>(
        `${this.base}/scenarios/${encodeURIComponent(scenarioId)}/duplicate`,
        null,
        { params },
      ),
    );
  }

  remove(scenarioId: string): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${this.base}/scenarios/${encodeURIComponent(scenarioId)}`),
    );
  }

  run(userId: string, scenarioId: string, dryRun = true): Promise<RunResponse> {
    const params = toHttpParams({ dry_run: dryRun });
    return firstValueFrom(
      this.http.post<RunResponse>(
        `${this.base}/users/${encodeURIComponent(userId)}/scenarios/${encodeURIComponent(scenarioId)}/run`,
        null,
        { params },
      ),
    );
  }

  getShares(scenarioId: string): Promise<ShareList> {
    return firstValueFrom(
      this.http.get<ShareList>(`${this.base}/scenarios/${encodeURIComponent(scenarioId)}/shares`),
    );
  }

  addShare(scenarioId: string, dto: Share): Promise<ShareResponse> {
    return firstValueFrom(
      this.http.post<ShareResponse>(
        `${this.base}/scenarios/${encodeURIComponent(scenarioId)}/shares`,
        dto,
      ),
    );
  }

  removeShare(scenarioId: string, shareUserId: string): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(
        `${this.base}/scenarios/${encodeURIComponent(scenarioId)}/shares/${encodeURIComponent(shareUserId)}`,
      ),
    );
  }
}
