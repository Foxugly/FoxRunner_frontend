import { NetworkHealthService } from './network-health.service';

describe('NetworkHealthService', () => {
  let service: NetworkHealthService;

  beforeEach(() => {
    service = new NetworkHealthService();
  });

  it('starts online', () => {
    expect(service.offline()).toBe(false);
    expect(service.consecutiveErrors()).toBe(0);
  });

  it('goes offline after threshold of non-auth failures', () => {
    service.reportFailure(500);
    service.reportFailure(503);
    expect(service.offline()).toBe(false);
    service.reportFailure(502);
    expect(service.offline()).toBe(true);
  });

  it('ignores 401/403 in offline count', () => {
    service.reportFailure(401);
    service.reportFailure(403);
    service.reportFailure(401);
    expect(service.consecutiveErrors()).toBe(0);
    expect(service.offline()).toBe(false);
  });

  it('resets on success', () => {
    service.reportFailure(500);
    service.reportFailure(500);
    service.reportSuccess();
    expect(service.consecutiveErrors()).toBe(0);
    expect(service.offline()).toBe(false);
  });
});
