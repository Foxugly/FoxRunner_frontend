import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => ctrl.verify());

  it('adds Authorization header when token is set and generates X-Request-ID', async () => {
    (auth as unknown as { _token: { set: (v: string) => void } })._token.set('abc-123');
    const promise = firstValueFrom(http.get('/foo'));
    const req = ctrl.expectOne('/foo');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc-123');
    const reqId = req.request.headers.get('X-Request-ID');
    expect(reqId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    req.flush({ ok: true });
    await promise;
  });

  it('does not add Authorization header when no token', async () => {
    const promise = firstValueFrom(http.get('/foo'));
    const req = ctrl.expectOne('/foo');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
    await promise;
  });
});
