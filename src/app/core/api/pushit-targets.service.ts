import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  PushItTarget,
  PushItTargetCreate,
  PushItTargetUpdate,
  PushItTestResult,
} from './types';

/**
 * Per-user PushIT applications the scheduler/scenarios notify. Every call is
 * scoped server-side to the authenticated user — targets are never shared.
 */
@Injectable({ providedIn: 'root' })
export class PushItTargetsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(): Promise<PushItTarget[]> {
    return firstValueFrom(this.http.get<PushItTarget[]>(`${this.base}/pushit-targets`));
  }

  create(dto: PushItTargetCreate): Promise<PushItTarget> {
    return firstValueFrom(this.http.post<PushItTarget>(`${this.base}/pushit-targets`, dto));
  }

  update(id: number, dto: PushItTargetUpdate): Promise<PushItTarget> {
    return firstValueFrom(
      this.http.patch<PushItTarget>(`${this.base}/pushit-targets/${id}`, dto),
    );
  }

  remove(id: number): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.base}/pushit-targets/${id}`));
  }

  test(id: number): Promise<PushItTestResult> {
    return firstValueFrom(
      this.http.post<PushItTestResult>(`${this.base}/pushit-targets/${id}/test`, null),
    );
  }
}
