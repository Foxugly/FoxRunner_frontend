import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Step, StepCollectionName, StepMutation } from './types';

type StepsByCollection = Record<StepCollectionName, Record<string, unknown>[]>;

@Injectable({ providedIn: 'root' })
export class StepCollectionsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private url(userId: string, scenarioId: string, suffix = ''): string {
    return `${this.base}/users/${encodeURIComponent(userId)}/scenarios/${encodeURIComponent(
      scenarioId,
    )}/step-collections${suffix}`;
  }

  getAll(userId: string, scenarioId: string): Promise<StepsByCollection> {
    return firstValueFrom(this.http.get<StepsByCollection>(this.url(userId, scenarioId)));
  }

  list(
    userId: string,
    scenarioId: string,
    collection: StepCollectionName,
  ): Promise<Record<string, unknown>[]> {
    return firstValueFrom(
      this.http.get<Record<string, unknown>[]>(
        this.url(userId, scenarioId, `/${collection}`),
      ),
    );
  }

  append(
    userId: string,
    scenarioId: string,
    collection: StepCollectionName,
    step: Record<string, unknown>,
  ): Promise<StepMutation> {
    return firstValueFrom(
      this.http.post<StepMutation>(this.url(userId, scenarioId, `/${collection}`), {
        step,
      } satisfies Step),
    );
  }

  replace(
    userId: string,
    scenarioId: string,
    collection: StepCollectionName,
    index: number,
    step: Record<string, unknown>,
  ): Promise<StepMutation> {
    return firstValueFrom(
      this.http.put<StepMutation>(this.url(userId, scenarioId, `/${collection}/${index}`), {
        step,
      } satisfies Step),
    );
  }

  remove(
    userId: string,
    scenarioId: string,
    collection: StepCollectionName,
    index: number,
  ): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(this.url(userId, scenarioId, `/${collection}/${index}`)),
    );
  }
}
