import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { JobsService } from '../../../core/api/jobs.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import { StepCollectionsService } from '../../../core/api/step-collections.service';
import { newIdempotencyKey } from '../../../core/utils/idempotency';
import type { StepLike } from '../../../core/api/step-label';
import {
  STEP_COLLECTIONS,
  type ScenarioDetail,
  type StepCollectionName,
} from '../../../core/api/types';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { FormFooterComponent } from '../../../shared/components/form-footer/form-footer.component';
import { JsonEditorComponent } from '../../../shared/components/json-editor/json-editor.component';
import { StepDisplayComponent } from '../../../shared/components/step-display/step-display.component';
import type { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import { SharesDialogComponent } from '../shares/shares-dialog.component';
import { ScenarioSlotsComponent } from './scenario-slots.component';
import { ScenarioExecutionsComponent } from './scenario-executions.component';

@Component({
  selector: 'app-scenario-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    TabsModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    PageHeaderComponent,
    StepDisplayComponent,
    EmptyStateComponent,
    FormFooterComponent,
    JsonEditorComponent,
    SharesDialogComponent,
    ScenarioSlotsComponent,
    ScenarioExecutionsComponent,
    TranslocoPipe,
  ],
  template: `
    <app-page-header
      icon="pi-sitemap"
      [title]="scenario()?.scenario_id ?? ('scenarios.detail.title_fallback' | transloco)"
    >
      <p-button
        slot="left"
        icon="pi pi-arrow-left"
        [label]="'scenarios.common.back' | transloco"
        [outlined]="true"
        severity="secondary"
        [routerLink]="['/scenarios']"
      />
      <p-button
        slot="right"
        [outlined]="true"
        severity="secondary"
        icon="pi pi-play"
        [pTooltip]="'scenarios.detail.run_dry' | transloco"
        tooltipPosition="bottom"
        [ariaLabel]="'scenarios.detail.run_dry' | transloco"
        [loading]="running()"
        [disabled]="!scenario() || running()"
        (onClick)="triggerRun(true)"
      />
      <p-button
        slot="right"
        [outlined]="true"
        severity="warn"
        icon="pi pi-bolt"
        [pTooltip]="'scenarios.detail.run_real' | transloco"
        tooltipPosition="bottom"
        [ariaLabel]="'scenarios.detail.run_real' | transloco"
        [loading]="running()"
        [disabled]="!scenario() || running()"
        (onClick)="confirmRealRun()"
      />
      <p-button
        slot="right"
        [outlined]="true"
        severity="secondary"
        icon="pi pi-download"
        [pTooltip]="'scenarios.detail.export' | transloco"
        tooltipPosition="bottom"
        [ariaLabel]="'scenarios.detail.export' | transloco"
        [disabled]="!scenario()"
        (onClick)="exportJson()"
      />
      @if (isOwner()) {
        <p-button
          slot="right"
          [outlined]="true"
          severity="secondary"
          icon="pi pi-share-alt"
          [pTooltip]="'scenarios.detail.shares' | transloco"
          tooltipPosition="bottom"
          [ariaLabel]="'scenarios.detail.shares' | transloco"
          (onClick)="sharesOpen = true"
        />
      }
      @if (isOwner()) {
        <p-button
          slot="right"
          [outlined]="true"
          severity="danger"
          icon="pi pi-trash"
          [pTooltip]="'scenarios.common.delete' | transloco"
          tooltipPosition="bottom"
          [ariaLabel]="'scenarios.common.delete' | transloco"
          [loading]="deleting()"
          [disabled]="!scenario() || deleting()"
          (onClick)="confirmDelete()"
        />
      }
    </app-page-header>

    <app-shares-dialog
      [scenarioId]="scenario()?.scenario_id ?? ''"
      [(visible)]="sharesOpen"
    />

    @if (scenario(); as s) {
      <p-tabs [(value)]="activeTab">
        <p-tablist>
          <p-tab value="general"><i class="pi pi-info-circle ico-gap"></i>{{ 'scenarios.detail.tab_general' | transloco }}</p-tab>
          <p-tab value="planning"><i class="pi pi-calendar ico-gap"></i>{{ 'scenarios.detail.tab_planning' | transloco }}</p-tab>
          <p-tab value="steps"><i class="pi pi-code ico-gap"></i>{{ 'scenarios.detail.tab_steps' | transloco: { count: totalSteps() } }}</p-tab>
          <p-tab value="executions"><i class="pi pi-play ico-gap"></i>{{ 'scenarios.detail.tab_executions' | transloco }}</p-tab>
        </p-tablist>
        <p-tabpanels>
          <!-- Onglet 1 : informations générales -->
          <p-tabpanel value="general">
            <div class="detail-grid">
              <div>
                <p-card>
                  <ng-template pTemplate="header">
                    <div class="card-head">
                      <span class="fw-semibold">{{ 'scenarios.detail.metadata' | transloco }}</span>
                      @if (isWritable() && !editingInfo()) {
                        <p-button
                          icon="pi pi-pencil"
                          [text]="true"
                          [rounded]="true"
                          size="small"
                          severity="info"
                          [pTooltip]="'scenarios.detail.edit' | transloco"
                          [ariaLabel]="'scenarios.detail.edit_info_aria' | transloco"
                          (onClick)="startEditInfo()"
                        />
                      }
                    </div>
                  </ng-template>

                  @if (!editingInfo()) {
                    <div class="meta-list">
                      <div><strong>{{ 'scenarios.detail.field_id' | transloco }}</strong> {{ s.scenario_id }}</div>
                      <div><strong>{{ 'scenarios.detail.field_owner' | transloco }}</strong> {{ s.owner_user_id }}</div>
                      <div>
                        <strong>{{ 'scenarios.detail.field_role' | transloco }}</strong>
                        @if (s.role === 'owner') {
                          <p-tag severity="success" [value]="'scenarios.tag.owner' | transloco" />
                        } @else {
                          <p-tag severity="secondary" [value]="s.role" />
                        }
                      </div>
                      <div>
                        <strong>{{ 'scenarios.detail.field_enterprise_network' | transloco }}</strong>
                        {{ (s.requires_enterprise_network ? 'scenarios.common.yes' : 'scenarios.common.no') | transloco }}
                      </div>
                      <div>
                        <strong>{{ 'scenarios.detail.field_writable' | transloco }}</strong>
                        {{ (s.writable ? 'scenarios.common.yes' : 'scenarios.detail.writable_no') | transloco }}
                      </div>
                      <div><strong>{{ 'scenarios.detail.field_description' | transloco }}</strong> {{ s.description || '—' }}</div>
                    </div>
                  } @else {
                    <div class="meta-grid">
                      <div class="meta-item">
                        <label class="meta-label" for="edit-owner">{{ 'scenarios.detail.owner_label' | transloco }}</label>
                        <div class="meta-value">
                          <input
                            id="edit-owner"
                            pInputText
                            [(ngModel)]="draftOwner"
                            [placeholder]="'scenarios.common.owner_placeholder' | transloco"
                          />
                        </div>
                      </div>
                      <div class="meta-item">
                        <label class="meta-label" for="edit-desc">{{ 'scenarios.detail.description_label' | transloco }}</label>
                        <div class="meta-value">
                          <textarea
                            id="edit-desc"
                            pTextarea
                            rows="3"
                            [(ngModel)]="draftDescription"
                            [placeholder]="'scenarios.common.description_placeholder' | transloco"
                          ></textarea>
                        </div>
                      </div>
                    </div>
                    <app-form-footer
                      [loading]="savingInfo()"
                      [disabled]="savingInfo()"
                      (save)="saveInfo()"
                      (cancelled)="cancelEditInfo()"
                    />
                  }
                </p-card>
              </div>
              <div>
                <p-card [header]="'scenarios.detail.step_count' | transloco">
                  <div class="count-grid">
                    <div>
                      <div class="count-num">{{ s.before_steps }}</div>
                      <div class="count-label">{{ 'scenarios.step_count.before' | transloco }}</div>
                    </div>
                    <div>
                      <div class="count-num">{{ s.steps }}</div>
                      <div class="count-label">{{ 'scenarios.step_count.body' | transloco }}</div>
                    </div>
                    <div>
                      <div class="count-num">{{ s.on_success }}</div>
                      <div class="count-label">{{ 'scenarios.step_count.on_success' | transloco }}</div>
                    </div>
                    <div>
                      <div class="count-num">{{ s.on_failure }}</div>
                      <div class="count-label">{{ 'scenarios.step_count.on_failure' | transloco }}</div>
                    </div>
                    <div>
                      <div class="count-num">{{ s.finally_steps }}</div>
                      <div class="count-label">{{ 'scenarios.step_count.finally' | transloco }}</div>
                    </div>
                  </div>
                </p-card>
              </div>
            </div>
          </p-tabpanel>

          <!-- Onglet 2 : planification / créneaux -->
          <p-tabpanel value="planning">
            <app-scenario-slots [scenarioId]="s.scenario_id" [canEdit]="isWritable()" />
          </p-tabpanel>

          <!-- Onglet 3 : étapes, rendues en langage naturel, éditables inline -->
          <p-tabpanel value="steps">
            @if (totalSteps() === 0 && !isWritable()) {
              <app-empty-state
                icon="pi-code"
                [title]="'scenarios.steps.empty_title' | transloco"
                [message]="'scenarios.steps.empty_message' | transloco"
              />
            } @else {
              @for (col of collections; track col) {
                @if (stepsFor(col).length > 0 || isWritable()) {
                  <section class="step-section">
                    <div class="step-head">
                      <h3 class="step-title">
                        {{ labelFor(col) }} ({{ stepsFor(col).length }})
                      </h3>
                      @if (isWritable()) {
                        <p-button
                          [label]="'scenarios.steps.add' | transloco"
                          icon="pi pi-plus"
                          size="small"
                          [text]="true"
                          (onClick)="openAddStep(col)"
                        />
                      }
                    </div>
                    @if (stepsFor(col).length > 0) {
                      <app-step-display
                        [steps]="stepsFor(col)"
                        [editable]="isWritable()"
                        (edit)="openEditStep(col, $event)"
                        (remove)="askDeleteStep(col, $event)"
                      />
                    } @else {
                      <p class="step-empty">{{ 'scenarios.steps.empty_collection' | transloco }}</p>
                    }
                  </section>
                }
              }
            }
          </p-tabpanel>
          <!-- Onglet 4 : exécutions de ce scénario (à la demande + planifiées) -->
          <p-tabpanel value="executions">
            <app-scenario-executions [scenarioId]="s.scenario_id" />
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    } @else if (!loading()) {
      <app-empty-state
        icon="pi-exclamation-triangle"
        [title]="'scenarios.detail.not_found_title' | transloco"
        [message]="'scenarios.detail.not_found_message' | transloco"
      />
    }

    <p-dialog
      [modal]="true"
      [(visible)]="stepDialogOpen"
      [header]="stepDialogHeader()"
      [style]="{ width: '700px' }"
      [closable]="!savingStep()"
    >
      <app-json-editor
        [label]="'scenarios.steps.json_label' | transloco"
        [value]="draftStep()"
        (valueChange)="onDraftStepChange($event)"
        (validChange)="draftStepValid.set($event)"
        [rows]="16"
      />
      <ng-template pTemplate="footer">
        <app-form-footer
          [loading]="savingStep()"
          [disabled]="!draftStepValid() || savingStep()"
          (save)="saveStep()"
          (cancelled)="closeStepDialog()"
        />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
  `,
  styleUrl: './scenario-detail.component.scss',
})
export class ScenarioDetailComponent implements OnInit, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly scenariosService = inject(ScenariosService);
  private readonly stepsService = inject(StepCollectionsService);
  private readonly jobs = inject(JobsService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

  readonly collections = STEP_COLLECTIONS;
  readonly scenario = signal<ScenarioDetail | null>(null);
  readonly stepsByCollection = signal<Record<StepCollectionName, Record<string, unknown>[]>>({
    before_steps: [],
    steps: [],
    on_success: [],
    on_failure: [],
    finally_steps: [],
  });
  readonly loading = signal(true);
  readonly running = signal(false);
  readonly deleting = signal(false);

  /** Active detail tab; can be preselected via ?tab= (e.g. a job's back link). */
  activeTab = 'general';

  readonly isWritable = computed(() => this.scenario()?.writable === true);
  readonly isOwner = computed(() => this.scenario()?.role === 'owner');
  readonly totalSteps = computed(() => {
    const by = this.stepsByCollection();
    return this.collections.reduce((sum, col) => sum + (by[col]?.length ?? 0), 0);
  });
  sharesOpen = false;

  // --- Inline metadata editing (replaces the standalone /edit page) ---
  readonly editingInfo = signal(false);
  readonly savingInfo = signal(false);
  draftDescription = '';
  draftOwner = '';

  hasUnsavedChanges(): boolean {
    return this.editingInfo();
  }

  startEditInfo(): void {
    const s = this.scenario();
    if (!s) return;
    this.draftDescription = s.description ?? '';
    this.draftOwner = s.owner_user_id ?? '';
    this.editingInfo.set(true);
  }

  cancelEditInfo(): void {
    this.editingInfo.set(false);
  }

  async saveInfo(): Promise<void> {
    const s = this.scenario();
    if (!s) return;
    this.savingInfo.set(true);
    try {
      const updated = await this.scenariosService.patch(s.scenario_id, {
        description: this.draftDescription,
        owner_user_id: this.draftOwner,
      });
      this.scenario.set(updated);
      this.messages.add({
        severity: 'success',
        summary: this.transloco.translate('scenarios.toast.updated'),
        detail: s.scenario_id,
        life: 2500,
      });
      this.editingInfo.set(false);
    } catch {
      /* errors surfaced by the HTTP interceptor */
    } finally {
      this.savingInfo.set(false);
    }
  }

  // --- Inline step editing (replaces the standalone /steps editor) ---
  stepDialogOpen = false;
  readonly editCollection = signal<StepCollectionName>('steps');
  readonly editIndex = signal<number | null>(null);
  readonly draftStep = signal<Record<string, unknown>>({});
  readonly draftStepValid = signal(true);
  readonly savingStep = signal(false);
  readonly stepDialogHeader = computed(() =>
    this.editIndex() !== null
      ? this.transloco.translate('scenarios.steps.edit_header', { index: this.editIndex() })
      : this.transloco.translate('scenarios.steps.add_header'),
  );
  private latestDraftStep: Record<string, unknown> = {};

  openAddStep(col: StepCollectionName): void {
    this.editCollection.set(col);
    this.editIndex.set(null);
    const seed = { type: 'sleep', seconds: 1 };
    this.draftStep.set(seed);
    this.latestDraftStep = seed;
    this.draftStepValid.set(true);
    this.stepDialogOpen = true;
  }

  openEditStep(col: StepCollectionName, index: number): void {
    const step = (this.stepsByCollection()[col] ?? [])[index];
    if (!step) return;
    this.editCollection.set(col);
    this.editIndex.set(index);
    this.draftStep.set(step);
    this.latestDraftStep = step;
    this.draftStepValid.set(true);
    this.stepDialogOpen = true;
  }

  closeStepDialog(): void {
    this.stepDialogOpen = false;
    this.editIndex.set(null);
  }

  onDraftStepChange(v: unknown): void {
    this.latestDraftStep = (v ?? {}) as Record<string, unknown>;
  }

  async saveStep(): Promise<void> {
    const me = this.auth.currentUser();
    const s = this.scenario();
    if (!me || !s || !this.draftStepValid()) return;
    this.savingStep.set(true);
    try {
      const col = this.editCollection();
      const idx = this.editIndex();
      if (idx === null) {
        await this.stepsService.append(me.id, s.scenario_id, col, this.latestDraftStep);
      } else {
        await this.stepsService.replace(me.id, s.scenario_id, col, idx, this.latestDraftStep);
      }
      this.messages.add({
        severity: 'success',
        summary: this.transloco.translate(idx === null ? 'scenarios.toast.step_added' : 'scenarios.toast.step_updated'),
        detail: this.labelFor(col),
        life: 2500,
      });
      this.closeStepDialog();
      await this.reloadSteps();
    } catch {
      /* errors are surfaced by the HTTP interceptor */
    } finally {
      this.savingStep.set(false);
    }
  }

  askDeleteStep(col: StepCollectionName, index: number): void {
    this.confirm.confirm({
      header: this.transloco.translate('scenarios.confirm.delete_step_header', { label: this.labelFor(col), index }),
      message: this.transloco.translate('scenarios.confirm.delete_step_message'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.transloco.translate('scenarios.common.delete'),
      rejectLabel: this.transloco.translate('scenarios.common.cancel'),
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        const me = this.auth.currentUser();
        const s = this.scenario();
        if (!me || !s) return;
        try {
          await this.stepsService.remove(me.id, s.scenario_id, col, index);
          this.messages.add({
            severity: 'success',
            summary: this.transloco.translate('scenarios.toast.step_deleted'),
            detail: this.labelFor(col),
            life: 2500,
          });
          await this.reloadSteps();
        } catch {
          /* errors surfaced by the interceptor */
        }
      },
    });
  }

  private async reloadSteps(): Promise<void> {
    const me = this.auth.currentUser();
    const s = this.scenario();
    if (!me || !s) return;
    const steps = await this.stepsService.getAll(me.id, s.scenario_id).catch(() => null);
    if (steps) {
      this.stepsByCollection.set({
        before_steps: steps.before_steps ?? [],
        steps: steps.steps ?? [],
        on_success: steps.on_success ?? [],
        on_failure: steps.on_failure ?? [],
        finally_steps: steps.finally_steps ?? [],
      });
    }
  }

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab && ['general', 'planning', 'steps', 'executions'].includes(tab)) {
      this.activeTab = tab;
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  labelFor(col: StepCollectionName): string {
    return this.transloco.translate('scenarios.collection.' + col);
  }

  /** Steps of one collection, typed for the human-readable renderer. */
  stepsFor(col: StepCollectionName): StepLike[] {
    return (this.stepsByCollection()[col] ?? []) as StepLike[];
  }

  private async load(scenarioId: string): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.loading.set(true);
    try {
      const [detail, steps] = await Promise.all([
        this.scenariosService.get(me.id, scenarioId),
        this.stepsService.getAll(me.id, scenarioId).catch(() => null),
      ]);
      this.scenario.set(detail);
      if (steps) {
        this.stepsByCollection.set({
          before_steps: steps.before_steps ?? [],
          steps: steps.steps ?? [],
          on_success: steps.on_success ?? [],
          on_failure: steps.on_failure ?? [],
          finally_steps: steps.finally_steps ?? [],
        });
      }
    } catch {
      this.scenario.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  confirmRealRun(): void {
    const s = this.scenario();
    if (!s) return;
    this.confirm.confirm({
      header: this.transloco.translate('scenarios.confirm.real_run_header'),
      message: this.transloco.translate('scenarios.confirm.real_run_message', { id: s.scenario_id }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.transloco.translate('scenarios.confirm.run_accept'),
      rejectLabel: this.transloco.translate('scenarios.common.cancel'),
      acceptButtonProps: { severity: 'warn' },
      accept: () => this.triggerRun(false),
    });
  }

  async triggerRun(dryRun: boolean): Promise<void> {
    const s = this.scenario();
    const me = this.auth.currentUser();
    if (!s || !me) return;
    this.running.set(true);
    try {
      const job = await this.jobs.trigger(me.id, s.scenario_id, dryRun, newIdempotencyKey());
      this.messages.add({
        severity: 'success',
        summary: this.transloco.translate(dryRun ? 'scenarios.toast.dry_run_started' : 'scenarios.toast.run_started'),
        detail: this.transloco.translate('scenarios.toast.job_detail', { id: job.job_id }),
        life: 4000,
      });
      this.router.navigate(['/jobs', job.job_id]);
    } catch {
      /* toast */
    } finally {
      this.running.set(false);
    }
  }

  confirmDelete(): void {
    const s = this.scenario();
    if (!s) return;
    this.confirm.confirm({
      header: this.transloco.translate('scenarios.confirm.delete_scenario_header'),
      message: this.transloco.translate('scenarios.confirm.delete_scenario_message', { id: s.scenario_id }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.transloco.translate('scenarios.common.delete'),
      rejectLabel: this.transloco.translate('scenarios.common.cancel'),
      acceptButtonProps: { severity: 'danger' },
      accept: () => void this.deleteScenario(),
    });
  }

  private async deleteScenario(): Promise<void> {
    const s = this.scenario();
    if (!s) return;
    this.deleting.set(true);
    try {
      await this.scenariosService.remove(s.scenario_id);
      this.messages.add({
        severity: 'success',
        summary: this.transloco.translate('scenarios.toast.deleted'),
        detail: s.scenario_id,
        life: 3000,
      });
      this.router.navigate(['/scenarios']);
    } catch {
      /* toast via interceptor */
    } finally {
      this.deleting.set(false);
    }
  }

  /** Download the scenario (id + description + DSL definition) as a JSON file,
   * re-importable via the scenarios list "Importer". */
  exportJson(): void {
    const s = this.scenario();
    if (!s) return;
    const payload = {
      schema: 'foxrunner.scenario/1',
      scenario_id: s.scenario_id,
      description: s.description,
      definition: s.definition,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.scenario_id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    this.messages.add({ severity: 'success', summary: this.transloco.translate('scenarios.toast.exported'), detail: `${s.scenario_id}.json`, life: 3000 });
  }
}
