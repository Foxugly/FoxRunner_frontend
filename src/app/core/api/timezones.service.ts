import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { TimezoneList } from './types';

@Injectable({ providedIn: 'root' })
export class TimezonesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listCommon(): Promise<TimezoneList> {
    return firstValueFrom(this.http.get<TimezoneList>(`${this.base}/timezones/common`));
  }
}
