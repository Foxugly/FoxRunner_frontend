import { Injectable } from '@angular/core';
import { COMMON_TIMEZONES, DEFAULT_TIMEZONE } from '../i18n/common-timezones';

export interface TimezoneList {
  default_timezone: string;
  timezones: string[];
}

/**
 * The Django backend no longer exposes `/timezones/common`. This service
 * keeps the same async surface (so callers do not change) but resolves from
 * a static IANA list bundled with the frontend. Works offline.
 */
@Injectable({ providedIn: 'root' })
export class TimezonesService {
  async listCommon(): Promise<TimezoneList> {
    return {
      default_timezone: DEFAULT_TIMEZONE,
      timezones: [...COMMON_TIMEZONES],
    };
  }
}
