import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService, CurrentUser } from './auth.service';
import { environment } from '../../../environments/environment';

const USER: CurrentUser = {
  id: 'u1',
  email: 'a@b.co',
  is_active: true,
  is_superuser: false,
  is_verified: true,
  timezone_name: 'Europe/Brussels',
};

describe('AuthService.loginWithToken', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores the token and loads the current user', async () => {
    const p = service.loginWithToken('jwt-123', 'refresh-123');
    const req = http.expectOne(`${environment.apiBaseUrl}/users/me`);
    expect(req.request.method).toBe('GET');
    req.flush(USER);
    await p;
    expect(service.token()).toBe('jwt-123');
    expect(service.currentUser()).toEqual(USER);
    expect(service.isLoggedIn()).toBe(true);
  });
});
