import { HttpHeaders, HttpParams } from '@angular/common/http';

export interface ListQuery {
  limit?: number;
  offset?: number;
}

export function toHttpParams(params: Record<string, unknown>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    p = p.set(k, String(v));
  }
  return p;
}

export function idempotencyHeaders(key?: string): HttpHeaders | undefined {
  return key ? new HttpHeaders({ 'Idempotency-Key': key }) : undefined;
}
