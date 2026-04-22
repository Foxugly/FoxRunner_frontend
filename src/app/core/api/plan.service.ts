import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Plan } from './types';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getPlan(userId: string): Promise<Plan | null> {
    return firstValueFrom(
      this.http.get<Plan | null>(`${this.base}/users/${encodeURIComponent(userId)}/plan`),
    );
  }
}
