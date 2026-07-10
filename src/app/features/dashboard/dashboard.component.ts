import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth/auth.service';
import { JobsService } from '../../core/api/jobs.service';
import { PlanService } from '../../core/api/plan.service';
import { ScenariosService } from '../../core/api/scenarios.service';
import { SystemStatusService } from '../../core/api/system-status.service';
import type { Job, Plan } from '../../core/api/types';
import { ApiDatePipe } from '../../shared/pipes/api-date.pipe';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusTagComponent } from '../../shared/components/status-tag/status-tag.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

const CHECK_KEYS: Record<string, string> = {
  database: 'dashboard.health.checks.database',
  redis: 'dashboard.health.checks.redis',
  celery_worker: 'dashboard.health.checks.celery_worker',
  celery_beat: 'dashboard.health.checks.celery_beat',
  scheduler: 'dashboard.health.checks.scheduler',
};

const CHECK_ORDER = ['scheduler', 'database', 'redis', 'celery_worker', 'celery_beat'];

interface HealthRow {
  key: string;
  label: string;
  status: string;
  detail?: string;
  command?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    ButtonModule,
    CardModule,
    SkeletonModule,
    TagModule,
    ApiDatePipe,
    PageHeaderComponent,
    StatusTagComponent,
    EmptyStateComponent,
    TranslocoPipe,
  ],
  template: `
    <app-page-header icon="pi-home" [title]="'dashboard.title' | transloco" />

    <div class="grid">
      <!-- Santé du système -->
      <div class="col-12 lg:col-6">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center justify-content-between p-3 pb-0">
              <span class="font-semibold"><i class="pi pi-heart-fill mr-2"></i>{{ 'dashboard.health.title' | transloco }}</span>
              @if (system(); as sys) {
                <p-tag [severity]="overallSeverity()" [value]="overallLabel(sys.status)" />
              }
            </div>
          </ng-template>
          @if (system(); as sys) {
            <div class="flex flex-column gap-2">
              @for (row of healthRows(); track row.key) {
                <div class="flex align-items-center justify-content-between gap-2">
                  <span class="flex align-items-center gap-2">
                    <i [class]="'pi ' + iconFor(row.status)" [style.color]="colorFor(row.status)"></i>
                    {{ row.label }}
                  </span>
                  <span class="text-sm text-color-secondary">{{ statusText(row.status) }}</span>
                </div>
                @if (row.command) {
                  <div class="text-xs ml-4 -mt-1">
                    <span class="text-color-secondary">{{ 'dashboard.health.restart' | transloco }} </span><code>{{ row.command }}</code>
                  </div>
                }
              }
            </div>
          } @else if (loading()) {
            <div class="flex flex-column gap-2">
              <p-skeleton height="1.5rem" />
              <p-skeleton height="1.5rem" />
              <p-skeleton height="1.5rem" />
              <p-skeleton height="1.5rem" />
              <p-skeleton height="1.5rem" />
            </div>
          } @else {
            <div class="text-color-secondary text-sm">{{ 'dashboard.health.unavailable' | transloco }}</div>
          }
        </p-card>
      </div>

      <!-- Prochaine exécution -->
      <div class="col-12 lg:col-6">
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-3 pb-0">
              <span class="font-semibold"><i class="pi pi-clock mr-2"></i>{{ 'dashboard.next.title' | transloco }}</span>
            </div>
          </ng-template>
          @if (plan(); as p) {
            <div class="flex flex-column align-items-center text-center gap-2 py-2">
              <div class="text-3xl font-bold" style="color: var(--accent)">{{ countdown() }}</div>
              <a
                [routerLink]="['/scenarios', p.scenario_id]"
                class="text-lg font-semibold no-underline text-color"
              >
                {{ p.scenario_id }}
              </a>
              <div class="text-color-secondary text-sm">
                <i class="pi pi-calendar mr-1"></i>{{ p.scheduled_for | apiDate: 'medium' }} · {{ 'dashboard.next.slot' | transloco: { slot: p.slot_id } }}
              </div>
            </div>
          } @else {
            <div class="flex flex-column align-items-center text-center gap-2 py-3 text-color-secondary">
              <i class="pi pi-calendar-times text-2xl"></i>
              <div class="text-sm">{{ 'dashboard.next.empty_1' | transloco }}<br />{{ 'dashboard.next.empty_2' | transloco }}</div>
            </div>
          }
        </p-card>
      </div>

      <!-- Scénarios (compteur + accès) -->
      <div class="col-12 lg:col-4">
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-3 pb-0">
              <span class="font-semibold"><i class="pi pi-sitemap mr-2"></i>{{ 'dashboard.scenarios.title' | transloco }}</span>
            </div>
          </ng-template>
          <div class="flex flex-column align-items-center text-center gap-2 py-2">
            <div class="text-4xl font-bold" style="color: var(--accent)">{{ scenarioCount() }}</div>
            <div class="text-color-secondary text-sm">
              {{ (scenarioCount() > 1 ? 'dashboard.scenarios.count_plural' : 'dashboard.scenarios.count_singular') | transloco }}
            </div>
            <p-button
              class="mt-2"
              [label]="'dashboard.scenarios.view' | transloco"
              icon="pi pi-arrow-right"
              iconPos="right"
              [text]="true"
              size="small"
              routerLink="/scenarios"
            />
          </div>
        </p-card>
      </div>

      <!-- Activité récente -->
      <div class="col-12 lg:col-8">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center p-3 pb-0">
              <span class="font-semibold"><i class="pi pi-history mr-2"></i>{{ 'dashboard.recent.title' | transloco }}</span>
            </div>
          </ng-template>
          @if (recentJobs().length === 0) {
            <app-empty-state icon="pi-history" [title]="'dashboard.recent.empty' | transloco" />
          } @else {
            <div class="flex flex-column gap-2">
              @for (j of recentJobs(); track j.job_id) {
                <a
                  [routerLink]="['/jobs', j.job_id]"
                  class="flex align-items-center justify-content-between gap-2 p-2 border-1 surface-border border-round no-underline text-color"
                >
                  <span class="flex align-items-center gap-2">
                    <app-status-tag [status]="j.status" />
                    <span class="font-medium">{{ j.target_id }}</span>
                    @if (j.dry_run) {
                      <p-tag severity="secondary" value="dry-run" />
                    }
                  </span>
                  <span class="flex align-items-center gap-3">
                    <span class="text-color-secondary text-sm">{{ (j.finished_at ?? j.created_at) | apiDate: 'short' }}</span>
                    @if (j.status === 'failed') {
                      <span class="text-red-500 text-sm">{{ 'dashboard.recent.see_failure' | transloco }}</span>
                    } @else {
                      <i class="pi pi-angle-right text-color-secondary"></i>
                    }
                  </span>
                </a>
              }
            </div>
          }
        </p-card>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly statusService = inject(SystemStatusService);
  private readonly planService = inject(PlanService);
  private readonly jobs = inject(JobsService);
  private readonly scenarios = inject(ScenariosService);
  private readonly transloco = inject(TranslocoService);

  // Reuse the global alarm-banner SystemStatusService (auto-polls /system/status
  // into a `status` signal) rather than running a second poll loop.
  readonly system = computed(() => this.statusService.status());
  readonly plan = signal<Plan | null>(null);
  readonly recentJobs = signal<Job[]>([]);
  readonly scenarioCount = signal<number>(0);
  readonly loading = signal(true);
  private readonly now = signal(0);

  private timer: ReturnType<typeof setInterval> | null = null;
  private ticks = 0;

  readonly healthRows = computed<HealthRow[]>(() => {
    const sys = this.system();
    if (!sys) return [];
    const names = Object.keys(sys.checks).sort(
      (a, b) => (CHECK_ORDER.indexOf(a) + 100) - (CHECK_ORDER.indexOf(b) + 100),
    );
    return names.map((key) => {
      const c = sys.checks[key];
      const labelKey = CHECK_KEYS[key];
      const label = labelKey ? this.transloco.translate(labelKey) : key;
      return { key, label, status: c.status, detail: c.detail, command: c.command };
    });
  });

  readonly countdown = computed<string>(() => {
    const p = this.plan();
    this.now(); // re-evaluate each tick
    if (!p) return '';
    const target = Date.parse(p.scheduled_for);
    if (Number.isNaN(target)) return '';
    const secs = Math.floor((target - Date.now()) / 1000);
    if (secs <= 0) return this.transloco.translate('dashboard.next.imminent');
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const time = `${pad(h)}:${pad(m)}:${pad(s)}`;
    return d > 0
      ? this.transloco.translate('dashboard.next.in_days', { days: d, time })
      : this.transloco.translate('dashboard.next.in_time', { time });
  });

  ngOnInit(): void {
    void this.load();
    // One 1s timer: drives the countdown; refreshes live data every 30 ticks.
    this.timer = setInterval(() => {
      this.now.set(this.ticks);
      this.ticks += 1;
      if (this.ticks % 30 === 0) void this.refreshLive();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      await Promise.all([this.refreshLive(), this.loadScenarioCount(), this.loadPlan()]);
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshLive(): Promise<void> {
    // System health is auto-polled by SystemStatusService (read via `system`).
    const me = this.auth.currentUser();
    if (!me) return;
    await this.jobs
      .list({ user_id: me.id, limit: 5 })
      .then((page) => this.recentJobs.set(page.items))
      .catch(() => {
        /* keep previous */
      });
  }

  private async loadPlan(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    try {
      this.plan.set(await this.planService.getPlan(me.id));
    } catch {
      this.plan.set(null);
    }
  }

  private async loadScenarioCount(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    try {
      const page = await this.scenarios.list(me.id, 1, 0);
      this.scenarioCount.set(page.total);
    } catch {
      /* keep previous */
    }
  }

  overallSeverity(): 'success' | 'warn' | 'danger' {
    const s = this.system()?.status;
    if (s === 'down') return 'danger';
    if (s === 'degraded') return 'warn';
    return 'success';
  }

  overallLabel(status: string): string {
    const key =
      status === 'ok'
        ? 'dashboard.health.overall.ok'
        : status === 'degraded'
          ? 'dashboard.health.overall.degraded'
          : 'dashboard.health.overall.down';
    return this.transloco.translate(key);
  }

  iconFor(status: string): string {
    if (status === 'ok') return 'pi-check-circle';
    if (status === 'disabled') return 'pi-minus-circle';
    return 'pi-times-circle';
  }

  colorFor(status: string): string {
    if (status === 'ok') return 'var(--p-green-500, #22c55e)';
    if (status === 'disabled') return 'var(--p-surface-400, #9ca3af)';
    return 'var(--p-red-500, #ef4444)';
  }

  statusText(status: string): string {
    if (status === 'ok') return this.transloco.translate('dashboard.health.status.active');
    if (status === 'disabled') return this.transloco.translate('dashboard.health.status.disabled');
    return this.transloco.translate('dashboard.health.status.down');
  }
}
