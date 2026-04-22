import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { JobsService } from './jobs.service';
import { environment } from '../../../environments/environment';
import type { Job } from './types';

function fakeJob(partial: Partial<Job> = {}): Job {
  return {
    job_id: 'j1',
    celery_task_id: null,
    status: 'queued',
    created_at: null,
    updated_at: null,
    started_at: null,
    finished_at: null,
    kind: 'scenario',
    user_id: 'u1',
    target_id: 's1',
    dry_run: false,
    exit_code: null,
    error: null,
    payload: {},
    result: {},
    ...partial,
  };
}

describe('JobsService', () => {
  let service: JobsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(JobsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('get() passes user_id as query param', async () => {
    const promise = service.get('j1', 'alice@test.local');
    const req = http.expectOne(
      `${environment.apiBaseUrl}/jobs/j1?user_id=alice@test.local`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(fakeJob());
    await promise;
  });

  it('events() fetches event list with user_id', async () => {
    const promise = service.events('j1', 'alice');
    const req = http.expectOne(`${environment.apiBaseUrl}/jobs/j1/events?user_id=alice`);
    req.flush([]);
    await promise;
  });

  it('cancel() posts with user_id param', async () => {
    const promise = service.cancel('j1', 'alice');
    const req = http.expectOne(`${environment.apiBaseUrl}/jobs/j1/cancel?user_id=alice`);
    expect(req.request.method).toBe('POST');
    req.flush(fakeJob({ status: 'cancelled' }));
    await promise;
  });

  it('trigger() uses dry_run query and Idempotency-Key header', async () => {
    const promise = service.trigger('alice', 'scn', true, 'idem-job');
    const req = http.expectOne(
      `${environment.apiBaseUrl}/users/alice/scenarios/scn/jobs?dry_run=true`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-job');
    req.flush(fakeJob({ dry_run: true }));
    await promise;
  });
});
