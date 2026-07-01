import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
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
import { DetailHeaderComponent } from '../../../shared/components/detail-header/detail-header.component';
import { StepDisplayComponent } from '../../../shared/components/step-display/step-display.component';
import { SharesDialogComponent } from '../shares/shares-dialog.component';
import { ScenarioSlotsComponent } from './scenario-slots.component';

@Component({
  selector: 'app-scenario-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    CardModule,
    TabsModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    DetailHeaderComponent,
    StepDisplayComponent,
    EmptyStateComponent,
    SharesDialogComponent,
    ScenarioSlotsComponent,
  ],
  template: `
    <app-detail-header
      icon="pi-sitemap"
      eyebrow="Scénario"
      [title]="scenario()?.scenario_id ?? 'Scénario'"
      [backLink]="['/scenarios']"
    >
      <p-button
        detailHeaderActions
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
        detailHeaderActions
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
        detailHeaderActions
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
      @if (isWritable()) {
        <p-button
          detailHeaderActions
          [rounded]="true"
          [outlined]="true"
          icon="pi pi-pencil"
          pTooltip="Éditer"
          tooltipPosition="bottom"
          ariaLabel="Éditer"
          [routerLink]="['/scenarios', scenario()?.scenario_id, 'edit']"
        />
      }
      @if (isWritable()) {
        <p-button
          detailHeaderActions
          [rounded]="true"
          [outlined]="true"
          severity="secondary"
          icon="pi pi-code"
          pTooltip="Éditer les steps"
          tooltipPosition="bottom"
          ariaLabel="Éditer les steps"
          [routerLink]="['/scenarios', scenario()?.scenario_id, 'steps']"
        />
      }
      @if (isOwner()) {
        <p-button
          detailHeaderActions
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
          detailHeaderActions
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
    </app-detail-header>

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
                <p-card header="Métadonnées">
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
                  </div>
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

          <!-- Onglet 3 : étapes, rendues en langage naturel -->
          <p-tabpanel value="steps">
            @if (totalSteps() === 0) {
              <app-empty-state
                icon="pi-code"
                title="Aucune étape"
                message="Ce scénario n'a pas encore d'étapes."
              />
            } @else {
              @for (col of collections; track col) {
                @if (stepsFor(col).length > 0) {
                  <section class="mb-4">
                    <h3 class="text-sm font-semibold text-color-secondary mt-0 mb-2">
                      {{ labelFor(col) }} ({{ stepsFor(col).length }})
                    </h3>
                    <app-step-display [steps]="stepsFor(col)" />
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

    <p-confirmDialog />
  `,
})
export class ScenarioDetailComponent implements OnInit {
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
