import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ScenariosService } from './scenarios.service';
import { environment } from '../../../environments/environment';
import type { ScenarioDetail } from './types';

describe('ScenariosService', () => {
  let service: ScenariosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScenariosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() hits GET /users/{id}/scenarios with limit & offset', async () => {
    const promise = service.list('alice@test.local', 25, 50);
    const req = http.expectOne(
      `${environment.apiBaseUrl}/users/alice%40test.local/scenarios?limit=25&offset=50`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, limit: 25, offset: 50 });
    await promise;
  });

  it('create() sets Idempotency-Key header when provided', async () => {
    const dto = {
      scenario_id: 's1',
      owner_user_id: 'alice',
      description: '',
      definition: {},
    };
    const detail: ScenarioDetail = {
      scenario_id: 's1',
      owner_user_id: 'alice',
      description: '',
      requires_enterprise_network: false,
      before_steps: 0,
      steps: 0,
      on_success: 0,
      on_failure: 0,
      finally_steps: 0,
      role: 'owner',
      writable: true,
      definition: {},
    };
    const promise = service.create(dto, 'idem-key-abc');
    const req = http.expectOne(`${environment.apiBaseUrl}/scenarios`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-key-abc');
    req.flush(detail);
    await promise;
  });

  it('run() sets dry_run param', async () => {
    const promise = service.run('alice', 'scn', false);
    const req = http.expectOne(
      `${environment.apiBaseUrl}/users/alice/scenarios/scn/run?dry_run=false`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({ scenario_id: 'scn', dry_run: false, exit_code: 0, success: true });
    await promise;
  });

  it('duplicate() uses query param new_scenario_id', async () => {
    const promise = service.duplicate('scn', 'scn_copy');
    const req = http.expectOne(
      `${environment.apiBaseUrl}/scenarios/scn/duplicate?new_scenario_id=scn_copy`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({
      scenario_id: 'scn_copy',
      owner_user_id: 'alice',
      description: '',
      requires_enterprise_network: false,
      before_steps: 0,
      steps: 0,
      on_success: 0,
      on_failure: 0,
      finally_steps: 0,
      definition: {},
    });
    await promise;
  });
});
