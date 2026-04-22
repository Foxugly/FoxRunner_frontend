import { Injectable, computed, signal } from '@angular/core';

const OFFLINE_THRESHOLD = 3;

@Injectable({ providedIn: 'root' })
export class NetworkHealthService {
  private readonly _consecutiveErrors = signal(0);
  private readonly _lastError = signal<number | null>(null);

  readonly consecutiveErrors = this._consecutiveErrors.asReadonly();
  readonly offline = computed(() => this._consecutiveErrors() >= OFFLINE_THRESHOLD);

  reportSuccess(): void {
    if (this._consecutiveErrors() > 0) {
      this._consecutiveErrors.set(0);
      this._lastError.set(null);
    }
  }

  reportFailure(status: number): void {
    // Ignore 401/403 — those are auth issues, not connectivity.
    if (status === 401 || status === 403) return;
    this._consecutiveErrors.update((n) => n + 1);
    this._lastError.set(status);
  }
}
