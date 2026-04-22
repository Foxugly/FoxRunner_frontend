import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { FeatureFlags } from './types';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getMyFeatures(): Promise<FeatureFlags> {
    return firstValueFrom(this.http.get<FeatureFlags>(`${this.base}/users/me/features`));
  }
}
