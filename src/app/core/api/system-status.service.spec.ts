import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { SystemStatusService } from './system-status.service';
import { environment } from '../../../environments/environment';

describe('SystemStatusService', () => {
  let service: SystemStatusService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SystemStatusService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('get() fetches /system/status and returns the body', async () => {
    const promise = service.get();
    const req = http.expectOne(`${environment.apiBaseUrl}/system/status`);
    expect(req.request.method).toBe('GET');
    const body = {
      status: 'degraded',
      generated_at: '2026-06-18T10:00:00Z',
      down: ['scheduler'],
      checks: {
        scheduler: { status: 'down', required: true, command: 'python main.py' },
        database: { status: 'ok', required: true },
      },
    };
    req.flush(body);
    expect(await promise).toEqual(body);
  });
});
