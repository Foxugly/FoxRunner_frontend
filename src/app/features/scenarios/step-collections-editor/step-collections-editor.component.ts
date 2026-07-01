import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../../core/auth/auth.service';
import { StepCollectionsService } from '../../../core/api/step-collections.service';
import {
  STEP_COLLECTIONS,
  STEP_COLLECTION_LABELS_FR,
  type StepCollectionName,
} from '../../../core/api/types';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FormFooterComponent } from '../../../shared/components/form-footer/form-footer.component';
import { JsonEditorComponent } from '../../../shared/components/json-editor/json-editor.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

type StepsByCollection = Record<StepCollectionName, Record<string, unknown>[]>;

@Component({
  selector: 'app-step-collections-editor',
  standalone: true,
  imports: [
    RouterLink,
    CardModule,
    ButtonModule,
    DialogModule,
    TabsModule,
    TagModule,
    ConfirmDialogModule,
    PageHeaderComponent,
    EmptyStateComponent,
    FormFooterComponent,
    JsonEditorComponent,
  ],
  template: `
    <app-page-header
      icon="pi-code"
      [title]="'Étapes — ' + scenarioId()"
    >
      <p-button
        label="Retour au scénario"
        icon="pi pi-arrow-left"
        severity="secondary"
        [text]="true"
        [routerLink]="['/scenarios', scenarioId()]"
      />
    </app-page-header>

    <p-tabs [value]="collections[0]">
      <p-tablist>
        @for (col of collections; track col) {
          <p-tab [value]="col">
            {{ label(col) }} ({{ stepsByCollection()[col]?.length ?? 0 }})
          </p-tab>
        }
      </p-tablist>
      <p-tabpanels>
        @for (col of collections; track col) {
          <p-tabpanel [value]="col">
            <div class="flex justify-content-end mb-2">
              <p-button
                label="Ajouter une étape"
                icon="pi pi-plus"
                severity="success"
                (onClick)="openAdd(col)"
              />
            </div>
            @if ((stepsByCollection()[col]?.length ?? 0) === 0) {
              <app-empty-state
                icon="pi-code"
                title="Aucune étape"
                [message]="'La collection ' + col + ' est vide.'"
              />
            } @else {
              <div class="flex flex-column gap-2">
                @for (step of stepsByCollection()[col]; track $index; let idx = $index) {
                  <p-card>
                    <div class="flex align-items-center justify-content-between gap-2">
                      <div class="flex align-items-center gap-2">
                        <p-tag severity="secondary" [value]="'#' + idx" />
                        <strong>{{ stepType(step) }}</strong>
                        <small class="text-color-secondary">{{ stepSummary(step) }}</small>
                      </div>
                      <div class="flex gap-1">
                        <p-button
                          icon="pi pi-pencil"
                          [rounded]="true"
                          [text]="true"
                          size="small"
                          (onClick)="openEdit(col, idx, step)"
                        />
                        <p-button
                          icon="pi pi-trash"
                          [rounded]="true"
                          [text]="true"
                          size="small"
                          severity="danger"
                          (onClick)="askDelete(col, idx)"
                        />
                      </div>
                    </div>
                  </p-card>
                }
              </div>
            }
          </p-tabpanel>
        }
      </p-tabpanels>
    </p-tabs>

    <p-dialog
      [modal]="true"
      [(visible)]="dialogOpen"
      [header]="dialogHeader()"
      [style]="{ width: '700px' }"
      [closable]="!saving()"
    >
      <app-json-editor
        label="Étape (JSON)"
        [value]="draftStep()"
        (valueChange)="onDraftChange($event)"
        (validChange)="draftValid.set($event)"
        [rows]="16"
      />
      <ng-template pTemplate="footer">
        <app-form-footer
          [loading]="saving()"
          [disabled]="!draftValid() || saving()"
          (save)="saveStep()"
          (cancelled)="closeDialog()"
        />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class StepCollectionsEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(StepCollectionsService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly collections = STEP_COLLECTIONS;
  readonly scenarioId = signal('');
  readonly stepsByCollection = signal<StepsByCollection>({
    before_steps: [],
    steps: [],
    on_success: [],
    on_failure: [],
    finally_steps: [],
  });

  dialogOpen = false;
  readonly editIndex = signal<number | null>(null);
  readonly editCollection = signal<StepCollectionName>('steps');
  readonly draftStep = signal<Record<string, unknown>>({});
  readonly draftValid = signal(true);
  readonly saving = signal(false);
  readonly dialogHeader = computed(() =>
    this.editIndex() !== null
      ? `Éditer l'étape #${this.editIndex()}`
      : 'Ajouter une étape',
  );
  private latestDraft: Record<string, unknown> = {};

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.scenarioId.set(id);
      void this.reload();
    }
  }

  label(col: StepCollectionName): string {
    return STEP_COLLECTION_LABELS_FR[col];
  }

  stepType(step: Record<string, unknown>): string {
    return (step['type'] as string | undefined) ?? 'step';
  }

  stepSummary(step: Record<string, unknown>): string {
    const keys = Object.keys(step).filter((k) => k !== 'type');
    return keys
      .slice(0, 3)
      .map((k) => {
        const v = step[k];
        const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `${k}=${str.length > 30 ? str.slice(0, 30) + '…' : str}`;
      })
      .join(' · ');
  }

  private async reload(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    try {
      const data = await this.service.getAll(me.id, this.scenarioId());
      this.stepsByCollection.set({
        before_steps: data.before_steps ?? [],
        steps: data.steps ?? [],
        on_success: data.on_success ?? [],
        on_failure: data.on_failure ?? [],
        finally_steps: data.finally_steps ?? [],
      });
    } catch {
      /* toast */
    }
  }

  openAdd(col: StepCollectionName): void {
    this.editCollection.set(col);
    this.editIndex.set(null);
    this.draftStep.set({ type: 'sleep', seconds: 1 });
    this.latestDraft = { type: 'sleep', seconds: 1 };
    this.draftValid.set(true);
    this.dialogOpen = true;
  }

  openEdit(col: StepCollectionName, index: number, step: Record<string, unknown>): void {
    this.editCollection.set(col);
    this.editIndex.set(index);
    this.draftStep.set(step);
    this.latestDraft = step;
    this.draftValid.set(true);
    this.dialogOpen = true;
  }

  closeDialog(): void {
    this.dialogOpen = false;
    this.editIndex.set(null);
  }

  onDraftChange(v: unknown): void {
    this.latestDraft = (v ?? {}) as Record<string, unknown>;
  }

  async saveStep(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me || !this.draftValid()) return;
    this.saving.set(true);
    try {
      const col = this.editCollection();
      const idx = this.editIndex();
      if (idx === null) {
        await this.service.append(me.id, this.scenarioId(), col, this.latestDraft);
      } else {
        await this.service.replace(me.id, this.scenarioId(), col, idx, this.latestDraft);
      }
      this.messages.add({
        severity: 'success',
        summary: idx === null ? 'Étape ajoutée' : 'Étape modifiée',
        detail: `${col} #${idx ?? '(fin)'}`,
        life: 2500,
      });
      this.closeDialog();
      await this.reload();
    } catch {
      /* toast */
    } finally {
      this.saving.set(false);
    }
  }

  askDelete(col: StepCollectionName, index: number): void {
    this.confirm.confirm({
      header: `Supprimer ${col} #${index} ?`,
      message: 'Cette action est immédiate et non réversible.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        const me = this.auth.currentUser();
        if (!me) return;
        try {
          await this.service.remove(me.id, this.scenarioId(), col, index);
          this.messages.add({
            severity: 'success',
            summary: 'Étape supprimée',
            detail: `${col} #${index}`,
            life: 2500,
          });
          await this.reload();
        } catch {
          /* toast */
        }
      },
    });
  }
}
