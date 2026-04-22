import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { idempotencyHeaders, toHttpParams } from './api-base';
import type { Job, JobEvent, Paginated } from './types';

export interface JobsListParams {
  user_id?: string;
  status?: string;
  scenario_id?: string;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(params: JobsListParams = {}): Promise<Paginated<Job>> {
    return firstValueFrom(
      this.http.get<Paginated<Job>>(`${this.base}/jobs`, {
        params: toHttpParams({ ...params }),
      }),
    );
  }

  get(jobId: string, userId: string): Promise<Job> {
    return firstValueFrom(
      this.http.get<Job>(`${this.base}/jobs/${encodeURIComponent(jobId)}`, {
        params: toHttpParams({ user_id: userId }),
      }),
    );
  }

  events(jobId: string, userId: string): Promise<JobEvent[]> {
    return firstValueFrom(
      this.http.get<JobEvent[]>(`${this.base}/jobs/${encodeURIComponent(jobId)}/events`, {
        params: toHttpParams({ user_id: userId }),
      }),
    );
  }

  cancel(jobId: string, userId: string): Promise<Job> {
    return firstValueFrom(
      this.http.post<Job>(
        `${this.base}/jobs/${encodeURIComponent(jobId)}/cancel`,
        null,
        { params: toHttpParams({ user_id: userId }) },
      ),
    );
  }

  retry(jobId: string, userId: string): Promise<Job> {
    return firstValueFrom(
      this.http.post<Job>(
        `${this.base}/jobs/${encodeURIComponent(jobId)}/retry`,
        null,
        { params: toHttpParams({ user_id: userId }) },
      ),
    );
  }

  trigger(
    userId: string,
    scenarioId: string,
    dryRun = false,
    idempotencyKey?: string,
  ): Promise<Job> {
    const headers = idempotencyHeaders(idempotencyKey);
    return firstValueFrom(
      this.http.post<Job>(
        `${this.base}/users/${encodeURIComponent(userId)}/scenarios/${encodeURIComponent(scenarioId)}/jobs`,
        null,
        { params: toHttpParams({ dry_run: dryRun }), ...(headers ? { headers } : {}) },
      ),
    );
  }
}
