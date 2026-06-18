import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth/auth.service';
import { JobsService } from '../../core/api/jobs.service';
import { PlanService } from '../../core/api/plan.service';
import { ScenariosService } from '../../core/api/scenarios.service';
import { SlotsService } from '../../core/api/slots.service';
import { SystemStatusService, type SystemStatus } from '../../core/api/system-status.service';
import type { Job, Plan } from '../../core/api/types';
import { ApiDatePipe } from '../../shared/pipes/api-date.pipe';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusTagComponent } from '../../shared/components/status-tag/status-tag.component';

const CHECK_LABELS: Record<string, string> = {
  database: 'Base de données',
  redis: 'Redis',
  celery_worker: 'Celery worker',
  celery_beat: 'Celery beat',
  scheduler: 'Scheduleur',
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
  imports: [RouterLink, ButtonModule, CardModule, TagModule, ApiDatePipe, PageHeaderComponent, StatusTagComponent],
  template: `
    <app-page-header icon="pi-home" title="Tableau de bord" />

    <div class="grid">
      <!-- Santé du système -->
      <div class="col-12 lg:col-6">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center justify-content-between p-3 pb-0">
              <span class="font-semibold"><i class="pi pi-heart-fill mr-2"></i>Santé du système</span>
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
                    <span class="text-color-secondary">Relancer : </span><code>{{ row.command }}</code>
                  </div>
                }
              }
            </div>
          } @else {
            <div class="text-color-secondary text-sm">
              @if (loading()) {
                <i class="pi pi-spin pi-spinner mr-2"></i>Chargement…
              } @else {
                État indisponible.
              }
            </div>
          }
        </p-card>
      </div>

      <!-- Prochaine exécution + KPIs -->
      <div class="col-12 lg:col-6">
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-3 pb-0">
              <span class="font-semibold"><i class="pi pi-clock mr-2"></i>Prochaine exécution</span>
            </div>
          </ng-template>
          @if (plan(); as p) {
            <div class="flex flex-column gap-1">
              <div class="text-xl font-semibold">{{ p.scenario_id }}</div>
              <div class="text-3xl font-bold text-primary">{{ countdown() }}</div>
              <div class="text-color-secondary text-sm">
                {{ p.scheduled_for | apiDate: 'medium' }} · slot {{ p.slot_id }}
              </div>
              <a class="text-sm mt-1" routerLink="/plan">Voir le planning →</a>
            </div>
          } @else {
            <div class="text-color-secondary text-sm">
              Aucun créneau planifié. Ajoute un créneau depuis un scénario.
            </div>
          }

          <div class="flex gap-4 mt-3 pt-3 border-top-1 surface-border flex-wrap">
            <div>
              <div class="text-2xl font-semibold">{{ counts().scenarios }}</div>
              <div class="text-color-secondary text-xs">scénarios</div>
            </div>
            <div>
              <div class="text-2xl font-semibold">{{ counts().activeSlots }}</div>
              <div class="text-color-secondary text-xs">créneaux actifs</div>
            </div>
            <div>
              <div class="text-2xl font-semibold">{{ counts().activeJobs }}</div>
              <div class="text-color-secondary text-xs">jobs actifs</div>
            </div>
          </div>
        </p-card>
      </div>

      <!-- Activité récente -->
      <div class="col-12">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center justify-content-between p-3 pb-0">
              <span class="font-semibold"><i class="pi pi-history mr-2"></i>Activité récente</span>
              <a class="text-sm" routerLink="/jobs">Tous les jobs →</a>
            </div>
          </ng-template>
          @if (recentJobs().length === 0) {
            <div class="text-color-secondary text-sm">Aucune exécution récente.</div>
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
                      <span class="text-red-500 text-sm">voir l'échec →</span>
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
  private readonly slots = inject(SlotsService);

  readonly system = signal<SystemStatus | null>(null);
  readonly plan = signal<Plan | null>(null);
  readonly recentJobs = signal<Job[]>([]);
  readonly counts = signal<{ scenarios: number; activeSlots: number; activeJobs: number }>({
    scenarios: 0,
    activeSlots: 0,
    activeJobs: 0,
  });
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
      return { key, label: CHECK_LABELS[key] ?? key, status: c.status, detail: c.detail, command: c.command };
    });
  });

  readonly countdown = computed<string>(() => {
    const p = this.plan();
    this.now(); // re-evaluate each tick
    if (!p) return '';
    const target = Date.parse(p.scheduled_for);
    if (Number.isNaN(target)) return '';
    const secs = Math.floor((target - Date.now()) / 1000);
    if (secs <= 0) return 'imminent';
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return d > 0 ? `dans ${d}j ${pad(h)}:${pad(m)}:${pad(s)}` : `dans ${pad(h)}:${pad(m)}:${pad(s)}`;
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
      await Promise.all([this.refreshLive(), this.loadCounts(), this.loadPlan()]);
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshLive(): Promise<void> {
    const me = this.auth.currentUser();
    await Promise.all([
      this.statusService
        .get()
        .then((s) => this.system.set(s))
        .catch(() => {
          /* tile shows unavailable */
        }),
      me
        ? this.jobs
            .list({ user_id: me.id, limit: 5 })
            .then((page) => this.recentJobs.set(page.items))
            .catch(() => {
              /* keep previous */
            })
        : Promise.resolve(),
    ]);
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

  private async loadCounts(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    const [scn, slotPage, running, queued] = await Promise.allSettled([
      this.scenarios.list(me.id, 1, 0),
      this.slots.list({ limit: 500, offset: 0 }),
      this.jobs.list({ user_id: me.id, status: 'running', limit: 1 }),
      this.jobs.list({ user_id: me.id, status: 'queued', limit: 1 }),
    ]);
    this.counts.set({
      scenarios: scn.status === 'fulfilled' ? scn.value.total : 0,
      activeSlots:
        slotPage.status === 'fulfilled'
          ? slotPage.value.items.filter((s) => s.enabled).length
          : 0,
      activeJobs:
        (running.status === 'fulfilled' ? running.value.total : 0) +
        (queued.status === 'fulfilled' ? queued.value.total : 0),
    });
  }

  overallSeverity(): 'success' | 'warn' | 'danger' {
    const s = this.system()?.status;
    if (s === 'down') return 'danger';
    if (s === 'degraded') return 'warn';
    return 'success';
  }

  overallLabel(status: string): string {
    return status === 'ok' ? 'Opérationnel' : status === 'degraded' ? 'Dégradé' : 'En panne';
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
    if (status === 'ok') return 'actif';
    if (status === 'disabled') return 'désactivé';
    return 'hors service';
  }
}
