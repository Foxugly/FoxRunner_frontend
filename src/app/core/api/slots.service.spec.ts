import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { SlotsService } from './slots.service';
import { environment } from '../../../environments/environment';
import type { Slot } from './types';

describe('SlotsService', () => {
  let service: SlotsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SlotsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() omits empty scenario_id filter', async () => {
    const promise = service.list({ limit: 10, offset: 0 });
    const req = http.expectOne(`${environment.apiBaseUrl}/slots?limit=10&offset=0`);
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, limit: 10, offset: 0 });
    await promise;
  });

  it('list() includes scenario_id when provided', async () => {
    const promise = service.list({ scenario_id: 's1', limit: 5, offset: 10 });
    const req = http.expectOne(
      `${environment.apiBaseUrl}/slots?scenario_id=s1&limit=5&offset=10`,
    );
    req.flush({ items: [], total: 0, limit: 5, offset: 10 });
    await promise;
  });

  it('create() sets Idempotency-Key header', async () => {
    const dto: Slot = {
      slot_id: 'slot1',
      scenario_id: 'scn',
      days: [0, 1, 2],
      start: '08:00',
      end: '08:15',
      enabled: true,
    };
    const promise = service.create(dto, 'idem-slot');
    const req = http.expectOne(`${environment.apiBaseUrl}/slots`);
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-slot');
    expect(req.request.body).toEqual(dto);
    req.flush(dto);
    await promise;
  });

  it('patch() does partial update', async () => {
    const promise = service.patch('slot1', { enabled: false });
    const req = http.expectOne(`${environment.apiBaseUrl}/slots/slot1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ enabled: false });
    req.flush({
      slot_id: 'slot1',
      scenario_id: 'scn',
      days: [0],
      start: '08:00',
      end: '08:15',
      enabled: false,
    });
    await promise;
  });
});
