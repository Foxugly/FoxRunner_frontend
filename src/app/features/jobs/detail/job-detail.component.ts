import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { JobsService } from '../../../core/api/jobs.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import { stepId, stepLabel, type StepLike } from '../../../core/api/step-label';
import {
  STEP_COLLECTIONS,
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
  pending: 'jd-c-muted',
  running: 'jd-c-primary',
  ok: 'jd-c-success',
  failed: 'jd-c-danger',
  skipped: 'jd-c-muted',
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
    TooltipModule,
    ApiDatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusTagComponent,
    TranslocoPipe,
  ],
  template: `
    <app-page-header icon="pi-play" [title]="'jobs.title' | transloco: { id: jobIdShort() || '…' }">
      <p-button
        slot="left"
        icon="pi pi-arrow-left"
        [label]="'jobs.back' | transloco"
        [outlined]="true"
        severity="secondary"
        [routerLink]="job()?.target_id ? ['/scenarios', job()!.target_id] : '/scenarios'"
        [queryParams]="{ tab: 'executions' }"
      />
      <p-button
        slot="right"
        icon="pi pi-refresh"
        [outlined]="true"
        severity="secondary"
        [loading]="loading()"
        (onClick)="reload()"
        [pTooltip]="'common.refresh' | transloco"
      />
      @if (job()?.status === 'queued' || job()?.status === 'running') {
        <p-button
          slot="right"
          icon="pi pi-times"
          [outlined]="true"
          severity="danger"
          [loading]="acting()"
          (onClick)="cancel()"
          [pTooltip]="'jobs.cancel' | transloco"
        />
      }
      @if (job()?.status === 'failed' || job()?.status === 'cancelled') {
        <p-button
          slot="right"
          icon="pi pi-refresh"
          [outlined]="true"
          severity="secondary"
          [loading]="acting()"
          (onClick)="retry()"
          [pTooltip]="'jobs.relaunch' | transloco"
        />
      }
    </app-page-header>

    @if (job(); as j) {
      <!-- Status header -->
      <p-card>
        <div class="jd-stack">
          <div class="jd-status-row">
            <span class="jd-target"><code>{{ j.target_id }}</code></span>
            <p-tag
              [value]="(j.dry_run ? 'jobs.dry_run' : 'jobs.real') | transloco"
              [severity]="j.dry_run ? 'info' : 'warn'"
            />
            <app-status-tag [status]="j.status" />
            <span class="jd-muted">
              <i class="pi pi-clock ico-gap-sm"></i>{{ elapsedLabel() }}
            </span>
          </div>
          <div class="jd-progress">
            <div class="jd-progress-row">
              <span>{{ 'jobs.steps_progress' | transloco: { done: progress().done, total: progress().total } }}</span>
              <span class="jd-muted">{{ progress().percent }} %</span>
            </div>
            <p-progressbar [value]="progress().percent" [showValue]="false" />
          </div>
        </div>
      </p-card>

      <!-- Checklist -->
      @if (groups().length > 0) {
        <p-card [header]="'jobs.steps_header' | transloco" class="jd-mt">
          <div class="jd-stack">
            @for (g of groups(); track g.collection) {
              <div [class.jd-dim]="!g.emphasised">
                <div class="jd-group-title">{{ 'jobs.collection.' + g.collection | transloco }}</div>
                <ul class="jd-steplist">
                  @for (row of g.rows; track row.stepId) {
                    <li class="jd-step">
                      <i [class]="'pi ' + iconFor(row.stepId) + ' ' + colorFor(row.stepId)"></i>
                      <span [class.jd-strong]="g.emphasised">{{ row.label }}</span>
                      @if (durationFor(row.stepId); as d) {
                        <small class="jd-muted">({{ d }})</small>
                      }
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </p-card>
      } @else if (!scenarioMissing()) {
        <p-card [header]="'jobs.steps_header' | transloco" class="jd-mt">
          <app-empty-state
            icon="pi-list"
            [title]="'jobs.steps_empty_title' | transloco"
            [message]="'jobs.steps_empty_message' | transloco"
          />
        </p-card>
      } @else {
        <p-card [header]="'jobs.steps_header' | transloco" class="jd-mt">
          <app-empty-state
            icon="pi-exclamation-triangle"
            [title]="'jobs.scenario_unavailable_title' | transloco"
            [message]="'jobs.scenario_unavailable_message' | transloco"
          />
        </p-card>
      }

      <!-- Failure card -->
      @if (j.status === 'failed') {
        <p-card class="jd-mt">
          <ng-template pTemplate="header">
            <div class="jd-fail-head">
              <i class="pi pi-times-circle ico-gap"></i>{{ 'jobs.failure_header' | transloco }}
            </div>
          </ng-template>
          <div class="jd-stack">
            @if (failingLabel(); as label) {
              <div>
                <div class="jd-note">{{ 'jobs.failing_step' | transloco }}</div>
                <div class="jd-strong">{{ label }}</div>
              </div>
            }
            @if (failureMessage(); as msg) {
              <div>
                <div class="jd-note">{{ 'jobs.message' | transloco }}</div>
                <div class="jd-danger">{{ msg }}</div>
              </div>
            }

            @if (failureTraceback(); as tb) {
              <p-panel [header]="'jobs.traceback' | transloco" [toggleable]="true" [collapsed]="true">
                <pre class="jd-pre">{{ tb }}</pre>
              </p-panel>
            }

            <p-panel [header]="'jobs.page_html' | transloco" [toggleable]="true" [collapsed]="true">
              @if (!j.dry_run) {
                <a
                  class="jd-link"
                  [href]="pageSourceUrl()"
                  target="_blank"
                  rel="noopener"
                >
                  {{ 'jobs.open_page_html' | transloco }}
                </a>
              } @else {
                <span class="jd-note">
                  {{ 'jobs.not_available_dry_run' | transloco }}
                </span>
              }
            </p-panel>

            @if (screenshotUrl(); as src) {
              <div>
                <div class="jd-note jd-note--mb">{{ 'jobs.screenshot' | transloco }}</div>
                <img
                  [src]="src"
                  [alt]="'jobs.screenshot_alt' | transloco"
                  class="jd-shot"
                />
              </div>
            }
          </div>
        </p-card>
      }

      <!-- Relaunch buttons -->
      @if (j.status === 'success' || j.status === 'failed' || j.status === 'cancelled') {
        <div class="jd-actions">
          <p-button
            [label]="'jobs.relaunch' | transloco"
            icon="pi pi-play"
            [loading]="acting()"
            (onClick)="relaunch(false)"
          />
          <p-button
            [label]="'jobs.relaunch_dry' | transloco"
            icon="pi pi-eye"
            severity="secondary"
            [loading]="acting()"
            (onClick)="relaunch(true)"
          />
        </div>
      }

      <!-- Raw event journal -->
      <p-panel [header]="'jobs.event_log' | transloco" [toggleable]="true" [collapsed]="true" class="jd-mt">
        @if (events().length === 0) {
          <app-empty-state
            icon="pi-clock"
            [title]="'jobs.no_events_title' | transloco"
            [message]="'jobs.no_events_message' | transloco"
          />
        } @else {
          <p-timeline [value]="events()" align="left">
            <ng-template pTemplate="marker" let-e>
              <span class="jd-marker" [class]="markerClass(e)">
                <i [class]="'pi ' + markerIcon(e)"></i>
              </span>
            </ng-template>
            <ng-template pTemplate="content" let-e>
              <div class="jd-event">
                <div class="jd-event-head">
                  <strong>{{ e.event_type }}</strong>
                  <small class="jd-muted">{{ e.created_at | apiDate: 'medium' }}</small>
                </div>
                @if (e.step) {
                  <div class="jd-event-text"><em>{{ 'jobs.event_step' | transloco: { step: e.step } }}</em></div>
                }
                <div class="jd-event-text">{{ e.message }}</div>
              </div>
            </ng-template>
          </p-timeline>
        }
      </p-panel>
    } @else if (!loading()) {
      <app-empty-state
        icon="pi-exclamation-triangle"
        [title]="'jobs.not_found_title' | transloco"
        [message]="'jobs.not_found_message' | transloco"
      />
    }
  `,
  styleUrl: './job-detail.component.scss',
})
export class JobDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(JobsService);
  private readonly scenarios = inject(ScenariosService);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

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
  private destroyed = false;

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
        heading: this.transloco.translate('jobs.collection.' + collection),
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
    this.destroyed = true;
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
    if (level === 'error' || level === 'critical') return 'jd-marker--error';
    if (level === 'warn' || level === 'warning') return 'jd-marker--warn';
    if (level === 'debug') return 'jd-marker--debug';
    return 'jd-marker--info';
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
    if (this.destroyed || this.refreshTimer) return;
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
        summary: this.transloco.translate('jobs.toast_cancelled'),
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
        summary: this.transloco.translate('jobs.toast_retried'),
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
        summary: this.transloco.translate(dryRun ? 'jobs.toast_relaunched_dry' : 'jobs.toast_relaunched'),
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
