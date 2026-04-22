import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService, type CurrentUser } from '../../core/auth/auth.service';
import { ApiDatePipe } from './api-date.pipe';

function setUser(auth: AuthService, tz: string): void {
  (auth as unknown as { _user: { set: (u: CurrentUser) => void } })._user.set({
    id: 'x',
    email: 'x',
    is_active: true,
    is_superuser: false,
    is_verified: true,
    timezone_name: tz,
  });
}

describe('ApiDatePipe', () => {
  let pipe: ApiDatePipe;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([]), ApiDatePipe],
    });
    pipe = TestBed.inject(ApiDatePipe);
    auth = TestBed.inject(AuthService);
  });

  it('returns empty string for null/undefined/empty input', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('converts UTC ISO to user timezone', () => {
    setUser(auth, 'Europe/Brussels');
    // 2026-04-22T14:30:00Z → 16:30 CEST (UTC+2 en avril)
    const out = pipe.transform('2026-04-22T14:30:00Z');
    expect(out).toContain('16:30');
  });

  it('converts the same timestamp differently for different timezones', () => {
    setUser(auth, 'Europe/Brussels');
    const brussels = pipe.transform('2026-04-22T14:30:00Z');
    setUser(auth, 'America/New_York');
    const nyc = pipe.transform('2026-04-22T14:30:00Z');
    expect(brussels).not.toBe(nyc);
  });
});
