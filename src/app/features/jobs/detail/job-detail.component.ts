import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { AuthService } from '../../../core/auth/auth.service';
import { JobsService } from '../../../core/api/jobs.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import { stepId, stepLabel, type StepLike } from '../../../core/api/step-label';
import {
  STEP_COLLECTIONS,
  STEP_COLLECTION_LABELS_FR,
  type Job,
  type JobEvent,
  type ScenarioDetail,
  type StepCollectionName,
} from '../../../core/api/types';
import { ApiDatePipe } from '../../../shared/pipes/api-date.pipe';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusTagComponent } from '../../../shared/components/status-tag/status-tag.component';

type StepStatus = 'pending' | 'running' | 'ok' | 'failed' | 'skipped';

interface StepRow {
  collection: StepCollectionName;
  stepId: string;
  label: string;
  type: string;
}

interface StepGroup {
  collection: StepCollectionName;
  heading: string;
  emphasised: boolean;
  rows: StepRow[];
}

const ICON_BY_STATUS: Record<StepStatus, string> = {
  pending: 'pi-circle',
  running: 'pi-spin pi-spinner',
  ok: 'pi-check-circle',
  failed: 'pi-times-circle',
  skipped: 'pi-minus-circle',
};

const COLOR_BY_STATUS: Record<StepStatus, string> = {
  pending: 'text-color-secondary',
  running: 'text-primary',
  ok: 'text-green-500',
  failed: 'text-red-500',
  skipped: 'text-color-secondary',
};

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    TimelineModule,
    ProgressBarModule,
    PanelModule,
    ApiDatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusTagComponent,
  ],
  template: `
    <app-page-header icon="pi-play" [title]="'Job ' + (jobIdShort() || '…')">
      <p-button
        label="Retour"
        icon="pi pi-arrow-left"
        severity="secondary"
        [text]="true"
        routerLink="/jobs"
      />
      <p-button
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
      />
      @if (job()?.status === 'queued' || job()?.status === 'running') {
        <p-button
          label="Annuler"
          icon="pi pi-times"
          severity="danger"
          [loading]="acting()"
          (onClick)="cancel()"
        />
      }
      @if (job()?.status === 'failed' || job()?.status === 'cancelled') {
        <p-button
          label="Relancer"
          icon="pi pi-refresh"
          severity="secondary"
          [loading]="acting()"
          (onClick)="retry()"
        />
      }
    </app-page-header>

    @if (job(); as j) {
      <!-- Status header -->
      <p-card>
        <div class="flex flex-column gap-3">
          <div class="flex flex-wrap align-items-center gap-3">
            <span class="text-lg font-medium"><code>{{ j.target_id }}</code></span>
            <p-tag
              [value]="j.dry_run ? 'dry-run' : 'réel'"
              [severity]="j.dry_run ? 'info' : 'warn'"
            />
            <app-status-tag [status]="j.status" />
            <span class="text-color-secondary">
              <i class="pi pi-clock mr-1"></i>{{ elapsedLabel() }}
            </span>
          </div>
          <div class="flex flex-column gap-1">
            <div class="flex justify-content-between text-sm">
              <span>{{ progress().done }}/{{ progress().total }} étapes</span>
              <span class="text-color-secondary">{{ progress().percent }} %</span>
            </div>
            <p-progressbar [value]="progress().percent" [showValue]="false" />
          </div>
        </div>
      </p-card>

      <!-- Checklist -->
      @if (groups().length > 0) {
        <p-card header="Étapes" styleClass="mt-3">
          <div class="flex flex-column gap-3">
            @for (g of groups(); track g.collection) {
              <div [class.opacity-70]="!g.emphasised">
                <div class="font-medium text-color-secondary mb-2">{{ g.heading }}</div>
                <ul class="list-none p-0 m-0 flex flex-column gap-2">
                  @for (row of g.rows; track row.stepId) {
                    <li class="flex align-items-center gap-2">
                      <i [class]="'pi ' + iconFor(row.stepId) + ' ' + colorFor(row.stepId)"></i>
                      <span [class.font-medium]="g.emphasised">{{ row.label }}</span>
                      @if (durationFor(row.stepId); as d) {
                        <small class="text-color-secondary">({{ d }})</small>
                      }
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </p-card>
      } @else if (!scenarioMissing()) {
        <p-card header="Étapes" styleClass="mt-3">
          <app-empty-state
            icon="pi-list"
            title="Aucune étape"
            message="Ce scénario ne définit aucune étape."
          />
        </p-card>
      } @else {
        <p-card header="Étapes" styleClass="mt-3">
          <app-empty-state
            icon="pi-exclamation-triangle"
            title="Scénario indisponible"
            message="Impossible de charger la définition du scénario. Consulte le journal détaillé ci-dessous."
          />
        </p-card>
      }

      <!-- Failure card -->
      @if (j.status === 'failed') {
        <p-card styleClass="mt-3">
          <ng-template pTemplate="header">
            <div class="p-3 text-red-500 font-medium">
              <i class="pi pi-times-circle mr-2"></i>Échec
            </div>
          </ng-template>
          <div class="flex flex-column gap-3">
            @if (failingLabel(); as label) {
              <div>
                <div class="text-color-secondary text-sm">Étape en échec</div>
                <div class="font-medium">{{ label }}</div>
              </div>
            }
            @if (failureMessage(); as msg) {
              <div>
                <div class="text-color-secondary text-sm">Message</div>
                <div class="text-red-500">{{ msg }}</div>
              </div>
            }

            @if (failureTraceback(); as tb) {
              <p-panel header="Traceback technique" [toggleable]="true" [collapsed]="true">
                <pre class="text-sm white-space-pre-wrap m-0">{{ tb }}</pre>
              </p-panel>
            }

            <p-panel header="HTML de la page" [toggleable]="true" [collapsed]="true">
              @if (!j.dry_run) {
                <a
                  class="text-primary"
                  [href]="pageSourceUrl()"
                  target="_blank"
                  rel="noopener"
                >
                  Ouvrir le HTML de la page (nouvel onglet)
                </a>
              } @else {
                <span class="text-color-secondary text-sm">
                  Non disponible en dry-run.
                </span>
              }
            </p-panel>

            @if (screenshotUrl(); as src) {
              <div>
                <div class="text-color-secondary text-sm mb-2">Capture d’écran</div>
                <img
                  [src]="src"
                  alt="Capture d’écran de l’échec"
                  class="max-w-full border-round border-1 surface-border"
                />
              </div>
            }
          </div>
        </p-card>
      }

      <!-- Relaunch buttons -->
      @if (j.status === 'success' || j.status === 'failed' || j.status === 'cancelled') {
        <div class="flex flex-wrap gap-2 mt-3">
          <p-button
            label="Relancer"
            icon="pi pi-play"
            [loading]="acting()"
            (onClick)="relaunch(false)"
          />
          <p-button
            label="Relancer en dry-run"
            icon="pi pi-eye"
            severity="secondary"
            [loading]="acting()"
            (onClick)="relaunch(true)"
          />
        </div>
      }

      <!-- Raw event journal -->
      <p-panel header="Journal détaillé" [toggleable]="true" [collapsed]="true" styleClass="mt-3">
        @if (events().length === 0) {
          <app-empty-state
            icon="pi-clock"
            title="Aucun événement"
            message="Les événements apparaîtront ici pendant et après l'exécution."
          />
        } @else {
          <p-timeline [value]="events()" align="left">
            <ng-template pTemplate="marker" let-e>
              <span
                class="flex w-2rem h-2rem align-items-center justify-content-center border-circle"
                [class]="markerClass(e)"
              >
                <i [class]="'pi ' + markerIcon(e)"></i>
              </span>
            </ng-template>
            <ng-template pTemplate="content" let-e>
              <div class="ml-2">
                <div class="flex align-items-center gap-2">
                  <strong>{{ e.event_type }}</strong>
                  <small class="text-color-secondary">{{ e.created_at | apiDate: 'medium' }}</small>
                </div>
                @if (e.step) {
                  <div class="text-sm"><em>Étape : {{ e.step }}</em></div>
                }
                <div class="text-sm">{{ e.message }}</div>
              </div>
            </ng-template>
          </p-timeline>
        }
      </p-panel>
    } @else if (!loading()) {
      <app-empty-state
        icon="pi-exclamation-triangle"
        title="Job introuvable"
        message="Vérifie l'identifiant dans l'URL."
      />
    }
  `,
})
export class JobDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(JobsService);
  private readonly scenarios = inject(ScenariosService);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessageService);

  readonly job = signal<Job | null>(null);
  readonly events = signal<JobEvent[]>([]);
  readonly definition = signal<Record<string, unknown> | null>(null);
  readonly scenarioMissing = signal(false);
  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly screenshotUrl = signal<string | null>(null);

  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private jobId = '';
  private screenshotTried = false;

  /** Step rows grouped by collection, only non-empty groups, in canonical order. */
  readonly groups = computed<StepGroup[]>(() => {
    const def = this.definition();
    if (!def) return [];
    const out: StepGroup[] = [];
    for (const collection of STEP_COLLECTIONS) {
      const raw = def[collection];
      const steps = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
      if (steps.length === 0) continue;
      const rows: StepRow[] = steps.map((step, i) => {
        const like = step as StepLike;
        return {
          collection,
          stepId: stepId(collection, i),
          label: stepLabel(like),
          type: like.type,
        };
      });
      out.push({
        collection,
        heading: STEP_COLLECTION_LABELS_FR[collection],
        emphasised: collection === 'steps',
        rows,
      });
    }
    return out;
  });

  private readonly allRows = computed<StepRow[]>(() =>
    this.groups().flatMap((g) => g.rows),
  );

  readonly progress = computed(() => {
    const rows = this.allRows();
    const total = rows.length;
    const done = rows.filter((r) => {
      const s = this.statusFor(r.stepId);
      return s === 'ok' || s === 'failed' || s === 'skipped';
    }).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { done, total, percent };
  });

  readonly elapsedLabel = computed(() => {
    const j = this.job();
    if (!j || !j.started_at) return '—';
    const start = new Date(j.started_at).getTime();
    const end = j.finished_at ? new Date(j.finished_at).getTime() : Date.now();
    const secs = Math.max(0, Math.round((end - start) / 1000));
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  });

  /** First step_failed event, if any. */
  private readonly failingEvent = computed<JobEvent | null>(
    () => this.events().find((e) => e.event_type === 'step_failed') ?? null,
  );

  readonly failingLabel = computed<string | null>(() => {
    const ev = this.failingEvent();
    if (!ev?.step) return null;
    const row = this.allRows().find((r) => r.stepId === ev.step);
    return row?.label ?? ev.step;
  });

  readonly failureMessage = computed<string | null>(() => this.failingEvent()?.message ?? null);

  readonly failureTraceback = computed<string | null>(() => {
    const tb = this.failingEvent()?.payload?.['traceback'];
    return typeof tb === 'string' && tb.length > 0 ? tb : null;
  });

  ngOnInit(): void {
    this.jobId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.jobId) void this.load();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.revokeScreenshot();
  }

  jobIdShort(): string {
    return this.jobId ? this.jobId.slice(0, 8) + '…' : '';
  }

  pageSourceUrl(): string {
    return this.service.artifactUrl(this.jobId, 'page_source');
  }

  /** Status of a checklist step from its events, with terminal precedence. */
  statusFor(stepIdValue: string): StepStatus {
    const evs = this.events().filter((e) => e.step === stepIdValue);
    if (evs.some((e) => e.event_type === 'step_failed')) return 'failed';
    if (evs.some((e) => e.event_type === 'step_succeeded')) return 'ok';
    if (evs.some((e) => e.event_type === 'step_skipped')) return 'skipped';
    if (evs.some((e) => e.event_type === 'step_started')) return 'running';
    return 'pending';
  }

  iconFor(stepIdValue: string): string {
    return ICON_BY_STATUS[this.statusFor(stepIdValue)];
  }

  colorFor(stepIdValue: string): string {
    return COLOR_BY_STATUS[this.statusFor(stepIdValue)];
  }

  /** Duration of the step's terminal event (ms → "X.Ys"), if recorded. */
  durationFor(stepIdValue: string): string | null {
    const terminal = this.events().find(
      (e) =>
        e.step === stepIdValue &&
        (e.event_type === 'step_succeeded' ||
          e.event_type === 'step_failed' ||
          e.event_type === 'step_skipped'),
    );
    const ms = terminal?.payload?.['duration_ms'];
    if (typeof ms !== 'number') return null;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  markerClass(e: JobEvent): string {
    const level = (e.level || 'info').toLowerCase();
    if (level === 'error' || level === 'critical') return 'bg-red-500 text-white';
    if (level === 'warn' || level === 'warning') return 'bg-orange-500 text-white';
    if (level === 'debug') return 'bg-gray-400 text-white';
    return 'bg-primary text-white';
  }

  markerIcon(e: JobEvent): string {
    const level = (e.level || 'info').toLowerCase();
    if (level === 'error' || level === 'critical') return 'pi-times';
    if (level === 'warn' || level === 'warning') return 'pi-exclamation-triangle';
    if (level === 'debug') return 'pi-circle';
    return 'pi-info-circle';
  }

  reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.loading.set(true);
    try {
      const j = await this.service.get(this.jobId, me.id);
      this.job.set(j);

      const [ev, scenario] = await Promise.all([
        this.service.events(this.jobId, me.id).catch(() => [] as JobEvent[]),
        this.scenarios
          .get(me.id, j.target_id)
          .then((s): ScenarioDetail | null => s)
          .catch(() => null),
      ]);
      this.events.set(ev);
      if (scenario) {
        this.definition.set(scenario.definition);
        this.scenarioMissing.set(false);
      } else {
        this.definition.set(null);
        this.scenarioMissing.set(true);
      }

      if (j.status === 'failed' && !j.dry_run) void this.loadScreenshot();

      if (j.status === 'queued' || j.status === 'running') this.startAutoRefresh();
      else this.stopAutoRefresh();
    } catch {
      this.job.set(null);
      this.stopAutoRefresh();
    } finally {
      this.loading.set(false);
    }
  }

  private async loadScreenshot(): Promise<void> {
    if (this.screenshotTried) return;
    this.screenshotTried = true;
    try {
      const url = await this.service.artifactBlob(this.jobId, 'screenshot');
      this.screenshotUrl.set(url);
    } catch {
      // No screenshot artifact (404 or dry-run); silently leave the image hidden.
      this.screenshotUrl.set(null);
    }
  }

  private revokeScreenshot(): void {
    const url = this.screenshotUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.screenshotUrl.set(null);
    }
  }

  private startAutoRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => this.reload(), 1_500);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async cancel(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.acting.set(true);
    try {
      await this.service.cancel(this.jobId, me.id);
      this.messages.add({
        severity: 'success',
        summary: 'Job annulé',
        detail: this.jobId,
        life: 3000,
      });
      this.reload();
    } catch {
      /* toast */
    } finally {
      this.acting.set(false);
    }
  }

  async retry(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.acting.set(true);
    try {
      await this.service.retry(this.jobId, me.id);
      this.messages.add({
        severity: 'success',
        summary: 'Job relancé',
        detail: this.jobId,
        life: 3000,
      });
      this.reload();
    } catch {
      /* toast */
    } finally {
      this.acting.set(false);
    }
  }

  async relaunch(dryRun: boolean): Promise<void> {
    const me = this.auth.currentUser();
    const j = this.job();
    if (!me || !j) return;
    this.acting.set(true);
    try {
      const newJob = await this.service.trigger(me.id, j.target_id, dryRun);
      this.messages.add({
        severity: 'success',
        summary: dryRun ? 'Relancé en dry-run' : 'Relancé',
        detail: newJob.job_id,
        life: 3000,
      });
      await this.router.navigate(['/jobs', newJob.job_id]);
      this.jobId = newJob.job_id;
      this.resetForReload();
      this.reload();
    } catch {
      /* toast */
    } finally {
      this.acting.set(false);
    }
  }

  /** Reset transient per-job state before loading a freshly triggered job. */
  private resetForReload(): void {
    this.stopAutoRefresh();
    this.revokeScreenshot();
    this.screenshotTried = false;
    this.events.set([]);
    this.definition.set(null);
    this.scenarioMissing.set(false);
    this.job.set(null);
  }
}
