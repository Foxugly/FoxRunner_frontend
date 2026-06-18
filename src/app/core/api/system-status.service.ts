import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** One dependency's health in GET /system/status. `checks` is a free dict
 * backend-side, so this is hand-typed (no generated schema entry). */
export interface SystemCheck {
  status: string; // 'ok' | 'down' | 'disabled'
  required?: boolean;
  detail?: string;
  command?: string;
}

export interface SystemStatus {
  status: 'ok' | 'degraded' | 'down';
  generated_at: string;
  down: string[];
  checks: Record<string, SystemCheck>;
}

@Injectable({ providedIn: 'root' })
export class SystemStatusService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  get(): Promise<SystemStatus> {
    return firstValueFrom(this.http.get<SystemStatus>(`${this.base}/system/status`));
  }
}
