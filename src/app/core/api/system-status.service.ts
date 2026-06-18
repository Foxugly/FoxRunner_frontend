import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface SystemCheck {
  status: string; // 'ok' | 'down' | 'disabled'
  detail?: string;
  state?: string | null;
  age_seconds?: number;
  last_beat_at?: string;
  /** Whether the deployment treats this dependency as required. */
  required?: boolean;
  /** OS-appropriate relaunch command (provided by the backend, when down). */
  command?: string;
}

export interface SystemStatus {
  status: 'ok' | 'degraded' | 'down';
  generated_at: string;
  down: string[];
  checks: Record<string, SystemCheck>;
}

/** How often the global alarm banner re-checks the backend's system status. */
const POLL_MS = 30_000;

/**
 * Polls GET /system/status while the user is logged in and exposes signals the
 * global alarm banner (app.html) renders. Mirrors NetworkHealthService: the
 * offline banner covers a fully-unreachable backend; THIS one covers a reachable
 * backend whose scheduler / Celery / Redis / DB is down (hence a failed request
 * resolves to null = no alarm, leaving total outages to the offline banner).
 */
@Injectable({ providedIn: 'root' })
export class SystemStatusService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiBaseUrl;

  readonly status = signal<SystemStatus | null>(null);

  /** True when the backend reports anything other than fully healthy. */
  readonly alarm = computed(() => {
    const s = this.status();
    return !!s && s.status !== 'ok';
  });

  /** 'down' (red) vs 'degraded' (amber) — drives the banner colour. */
  readonly severity = computed<'down' | 'degraded' | null>(() => {
    const s = this.status();
    return s && s.status !== 'ok' ? s.status : null;
  });

  /** One entry per failing dependency: a French line + (when the operator can
   * fix it by running something) the exact command to relaunch it. */
  readonly items = computed<AlarmItem[]>(() => buildItems(this.status()));

  constructor() {
    timer(0, POLL_MS)
      .pipe(
        switchMap(() =>
          this.auth.isLoggedIn()
            ? this.http
                .get<SystemStatus>(`${this.base}/system/status`)
                .pipe(catchError(() => of(null)))
            : of(null),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((value) => this.status.set(value));
  }
}

/** A failing-dependency line for the banner, with an optional fix command. */
export interface AlarmItem {
  label: string;
  /** Shell command to relaunch the dependency (operator can copy/paste it). */
  command?: string;
}

const LABELS: Record<string, string> = {
  database: 'Base de données injoignable',
  redis: 'Redis (broker) injoignable',
  celery_worker: 'Aucun worker Celery actif',
  celery_beat: 'Celery beat à l’arrêt',
  scheduler: 'Scheduleur hors-ligne',
};

function buildItems(status: SystemStatus | null): AlarmItem[] {
  if (!status || status.status === 'ok') return [];
  // `down` already excludes dependencies the deployment doesn't use (the backend
  // marks those "disabled"), so we only ever list things that genuinely matter.
  return status.down.map((name) => {
    const check = status.checks?.[name];
    const base = LABELS[name] ?? name;
    let label: string;
    if (name === 'scheduler' && check) {
      const age = check.age_seconds;
      label = typeof age === 'number' ? `${base} (depuis ${formatAge(age)})` : `${base} (arrêté)`;
    } else {
      label = check?.detail ? `${base} — ${check.detail}` : base;
    }
    // The relaunch command is OS-aware and comes from the backend (it knows
    // whether it runs on Windows → venv binaries, or elsewhere → make targets).
    return { label, command: check?.command };
  });
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds / 3600)} h`;
}
