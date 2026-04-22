import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService, type CurrentUser } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', children: [] }]),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends login as form-urlencoded and stores token + user', async () => {
    const user: CurrentUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'alice@test.local',
      is_active: true,
      is_superuser: false,
      is_verified: true,
      timezone_name: 'Europe/Brussels',
    };
    const promise = service.login('alice@test.local', 'secret');

    const loginReq = http.expectOne(`${environment.apiBaseUrl}/auth/jwt/login`);
    expect(loginReq.request.method).toBe('POST');
    expect(loginReq.request.headers.get('Content-Type')).toBe(
      'application/x-www-form-urlencoded',
    );
    expect(loginReq.request.body).toBe('username=alice@test.local&password=secret');
    loginReq.flush({ access_token: 'tok-abc', token_type: 'bearer' });
    await Promise.resolve();
    await Promise.resolve();

    const meReq = http.expectOne(`${environment.apiBaseUrl}/users/me`);
    expect(meReq.request.method).toBe('GET');
    meReq.flush(user);

    await promise;

    expect(service.token()).toBe('tok-abc');
    expect(service.currentUser()).toEqual(user);
    expect(service.isLoggedIn()).toBe(true);
    expect(service.isSuperuser()).toBe(false);
  });

  it('clears state on logout', async () => {
    (service as unknown as { _token: { set: (v: string) => void } })._token.set('tok');
    (service as unknown as { _user: { set: (v: CurrentUser) => void } })._user.set({
      id: 'x',
      email: 'x',
      is_active: true,
      is_superuser: true,
      is_verified: true,
      timezone_name: 'Europe/Brussels',
    });
    const promise = service.logout();
    const req = http.expectOne(`${environment.apiBaseUrl}/auth/jwt/logout`);
    req.flush({});
    await promise;
    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });
});
