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
import { AuthService } from '../../../core/auth/auth.service';
import { JobsService } from '../../../core/api/jobs.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import { StepCollectionsService } from '../../../core/api/step-collections.service';
import { newIdempotencyKey } from '../../../core/utils/idempotency';
import type { StepLike } from '../../../core/api/step-label';
import {
  STEP_COLLECTIONS,
  STEP_COLLECTION_LABELS_FR,
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

@Component({
  selector: 'app-scenario-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TabsModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    RouterLink,
    PageHeaderComponent,
    StepDisplayComponent,
    EmptyStateComponent,
    FormFooterComponent,
    JsonEditorComponent,
    SharesDialogComponent,
    ScenarioSlotsComponent,
  ],
  template: `
    <app-page-header icon="pi-sitemap" [title]="scenario()?.scenario_id ?? 'Scénario'">
      <p-button
        label="Retour"
        icon="pi pi-arrow-left"
        severity="secondary"
        [text]="true"
        routerLink="/scenarios"
      />
      <p-button
        [rounded]="true"
        [outlined]="true"
        severity="secondary"
        icon="pi pi-play"
        pTooltip="Exécuter (dry-run)"
        tooltipPosition="bottom"
        ariaLabel="Exécuter (dry-run)"
        [loading]="running()"
        [disabled]="!scenario() || running()"
        (onClick)="triggerRun(true)"
      />
      <p-button
        [rounded]="true"
        [outlined]="true"
        severity="warn"
        icon="pi pi-bolt"
        pTooltip="Exécuter (réel)"
        tooltipPosition="bottom"
        ariaLabel="Exécuter (réel)"
        [loading]="running()"
        [disabled]="!scenario() || running()"
        (onClick)="confirmRealRun()"
      />
      <p-button
        [rounded]="true"
        [outlined]="true"
        severity="secondary"
        icon="pi pi-download"
        pTooltip="Exporter JSON"
        tooltipPosition="bottom"
        ariaLabel="Exporter JSON"
        [disabled]="!scenario()"
        (onClick)="exportJson()"
      />
      @if (isOwner()) {
        <p-button
          [rounded]="true"
          [outlined]="true"
          severity="secondary"
          icon="pi pi-share-alt"
          pTooltip="Partages"
          tooltipPosition="bottom"
          ariaLabel="Partages"
          (onClick)="sharesOpen = true"
        />
      }
      @if (isOwner()) {
        <p-button
          [rounded]="true"
          [outlined]="true"
          severity="danger"
          icon="pi pi-trash"
          pTooltip="Supprimer"
          tooltipPosition="bottom"
          ariaLabel="Supprimer"
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
      <p-tabs value="general">
        <p-tablist>
          <p-tab value="general"><i class="pi pi-info-circle mr-2"></i>Informations générales</p-tab>
          <p-tab value="planning"><i class="pi pi-calendar mr-2"></i>Planification</p-tab>
          <p-tab value="steps"><i class="pi pi-code mr-2"></i>Étapes ({{ totalSteps() }})</p-tab>
        </p-tablist>
        <p-tabpanels>
          <!-- Onglet 1 : informations générales -->
          <p-tabpanel value="general">
            <div class="grid">
              <div class="col-12 md:col-6">
                <p-card>
                  <ng-template pTemplate="header">
                    <div class="flex align-items-center justify-content-between p-3 pb-0">
                      <span class="font-semibold">Métadonnées</span>
                      @if (isWritable() && !editingInfo()) {
                        <p-button
                          icon="pi pi-pencil"
                          [text]="true"
                          [rounded]="true"
                          size="small"
                          severity="secondary"
                          pTooltip="Modifier"
                          ariaLabel="Modifier les informations"
                          (onClick)="startEditInfo()"
                        />
                      }
                    </div>
                  </ng-template>

                  @if (!editingInfo()) {
                    <div class="flex flex-column gap-2 text-sm">
                      <div><strong>Identifiant :</strong> {{ s.scenario_id }}</div>
                      <div><strong>Propriétaire :</strong> {{ s.owner_user_id }}</div>
                      <div>
                        <strong>Rôle :</strong>
                        @if (s.role === 'owner') {
                          <p-tag severity="success" value="Propriétaire" />
                        } @else {
                          <p-tag severity="secondary" [value]="s.role" />
                        }
                      </div>
                      <div>
                        <strong>Réseau entreprise requis :</strong>
                        {{ s.requires_enterprise_network ? 'Oui' : 'Non' }}
                      </div>
                      <div>
                        <strong>Écriture :</strong>
                        {{ s.writable ? 'Oui' : 'Non (lecture seule)' }}
                      </div>
                      <div><strong>Description :</strong> {{ s.description || '—' }}</div>
                    </div>
                  } @else {
                    <div class="meta-grid">
                      <div class="meta-item">
                        <label class="meta-label" for="edit-owner">Propriétaire</label>
                        <div class="meta-value">
                          <input
                            id="edit-owner"
                            pInputText
                            [(ngModel)]="draftOwner"
                            placeholder="email ou UUID"
                          />
                        </div>
                      </div>
                      <div class="meta-item">
                        <label class="meta-label" for="edit-desc">Description</label>
                        <div class="meta-value">
                          <textarea
                            id="edit-desc"
                            pTextarea
                            rows="3"
                            [(ngModel)]="draftDescription"
                            placeholder="Que fait ce scénario ?"
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
              <div class="col-12 md:col-6">
                <p-card header="Décompte d'étapes">
                  <div class="grid text-center">
                    <div class="col-6 md:col-4">
                      <div class="text-2xl font-semibold">{{ s.before_steps }}</div>
                      <div class="text-color-secondary text-sm">Préparation</div>
                    </div>
                    <div class="col-6 md:col-4">
                      <div class="text-2xl font-semibold">{{ s.steps }}</div>
                      <div class="text-color-secondary text-sm">Corps</div>
                    </div>
                    <div class="col-6 md:col-4">
                      <div class="text-2xl font-semibold">{{ s.on_success }}</div>
                      <div class="text-color-secondary text-sm">Succès</div>
                    </div>
                    <div class="col-6 md:col-4">
                      <div class="text-2xl font-semibold">{{ s.on_failure }}</div>
                      <div class="text-color-secondary text-sm">Échec</div>
                    </div>
                    <div class="col-6 md:col-4">
                      <div class="text-2xl font-semibold">{{ s.finally_steps }}</div>
                      <div class="text-color-secondary text-sm">Finalement</div>
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
                title="Aucune étape"
                message="Ce scénario n'a pas encore d'étapes."
              />
            } @else {
              @for (col of collections; track col) {
                @if (stepsFor(col).length > 0 || isWritable()) {
                  <section class="mb-4">
                    <div class="flex align-items-center justify-content-between mb-2">
                      <h3 class="text-sm font-semibold text-color-secondary m-0">
                        {{ labelFor(col) }} ({{ stepsFor(col).length }})
                      </h3>
                      @if (isWritable()) {
                        <p-button
                          label="Ajouter une étape"
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
                      <p class="text-sm text-color-secondary m-0">Vide.</p>
                    }
                  </section>
                }
              }
            }
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    } @else if (!loading()) {
      <app-empty-state
        icon="pi-exclamation-triangle"
        title="Scénario introuvable"
        message="Vérifie l'identifiant dans l'URL."
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
        label="Étape (JSON)"
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
        summary: 'Scénario mis à jour',
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
    this.editIndex() !== null ? `Éditer l'étape #${this.editIndex()}` : 'Ajouter une étape',
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
        summary: idx === null ? 'Étape ajoutée' : 'Étape modifiée',
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
      header: `Supprimer ${this.labelFor(col)} #${index} ?`,
      message: 'Cette action est immédiate et non réversible.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        const me = this.auth.currentUser();
        const s = this.scenario();
        if (!me || !s) return;
        try {
          await this.stepsService.remove(me.id, s.scenario_id, col, index);
          this.messages.add({
            severity: 'success',
            summary: 'Étape supprimée',
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
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  labelFor(col: StepCollectionName): string {
    return STEP_COLLECTION_LABELS_FR[col];
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
      header: 'Exécuter en réel ?',
      message: `Le scénario « ${s.scenario_id} » va être exécuté immédiatement (effets externes non-simulés).`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Exécuter',
      rejectLabel: 'Annuler',
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
        summary: dryRun ? 'Dry-run lancé' : 'Exécution lancée',
        detail: `Job ${job.job_id}`,
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
      header: 'Supprimer le scénario ?',
      message: `Le scénario « ${s.scenario_id} » sera définitivement supprimé.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
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
        summary: 'Scénario supprimé',
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
    this.messages.add({ severity: 'success', summary: 'Scénario exporté', detail: `${s.scenario_id}.json`, life: 3000 });
  }
}
