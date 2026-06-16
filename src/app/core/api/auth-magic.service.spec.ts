import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthMagicService } from './auth-magic.service';
import { environment } from '../../../environments/environment';

describe('AuthMagicService', () => {
  let service: AuthMagicService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthMagicService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('request() POSTs the email to magic-link/request', async () => {
    const p = service.request('a@b.co');
    const req = http.expectOne(`${environment.apiBaseUrl}/auth/magic-link/request`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.co' });
    req.flush({ status: 'queued' });
    await p;
  });

  it('exchange() POSTs the token and returns the access token', async () => {
    const p = service.exchange('tok-1');
    const req = http.expectOne(`${environment.apiBaseUrl}/auth/magic-link/exchange`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok-1' });
    req.flush({ access_token: 'jwt-123', token_type: 'bearer' });
    expect(await p).toEqual({ access_token: 'jwt-123', token_type: 'bearer' });
  });
});
