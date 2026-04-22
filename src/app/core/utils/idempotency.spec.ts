import { newIdempotencyKey } from './idempotency';

describe('newIdempotencyKey', () => {
  it('returns UUID v4 strings', () => {
    const key = newIdempotencyKey();
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('returns unique values across many calls', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) keys.add(newIdempotencyKey());
    expect(keys.size).toBe(100);
  });
});
