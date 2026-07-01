import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../../core/auth/auth.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import { newIdempotencyKey } from '../../../core/utils/idempotency';
import type { ScenarioDetail } from '../../../core/api/types';
import { FormFooterComponent } from '../../../shared/components/form-footer/form-footer.component';
import { JsonEditorComponent } from '../../../shared/components/json-editor/json-editor.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

const EMPTY_DEFINITION = {
  before_steps: [],
  steps: [],
  on_success: [],
  on_failure: [],
  finally_steps: [],
};

@Component({
  selector: 'app-scenario-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    TooltipModule,
    FormFooterComponent,
    PageHeaderComponent,
    JsonEditorComponent,
  ],
  template: `
    <app-page-header
      [icon]="isEdit() ? 'pi pi-pencil' : 'pi pi-plus'"
      [title]="isEdit() ? 'Modifier le scénario' : 'Nouveau scénario'"
    />

    <p-card>
      <h3 class="builder-section-title">Informations</h3>
      <form [formGroup]="form" class="meta-grid cols-2">
        <div class="meta-item">
          <label class="meta-label" for="scenario_id">
            Identifiant
            @if (isEdit()) {
              <i
                class="pi pi-info-circle"
                pTooltip="L'identifiant ne peut pas être modifié après création."
                tooltipPosition="top"
              ></i>
            }
          </label>
          <div class="meta-value">
            <input
              id="scenario_id"
              pInputText
              formControlName="scenario_id"
              placeholder="ex. alice_pointer"
            />
          </div>
        </div>
        <div class="meta-item">
          <label class="meta-label" for="owner">Propriétaire</label>
          <div class="meta-value">
            <input
              id="owner"
              pInputText
              formControlName="owner_user_id"
              placeholder="email ou UUID"
            />
          </div>
        </div>
        <div class="meta-item meta-item--full">
          <label class="meta-label" for="description">Description</label>
          <div class="meta-value">
            <textarea
              id="description"
              pTextarea
              rows="3"
              formControlName="description"
              placeholder="Que fait ce scénario ?"
            ></textarea>
          </div>
        </div>
      </form>
    </p-card>

    <p-card styleClass="mt-3">
      <h3 class="builder-section-title">Définition (JSON)</h3>
      <p class="text-color-secondary text-sm mb-2">
        Structure recommandée : objet avec clés <code>before_steps</code>, <code>steps</code>,
        <code>on_success</code>, <code>on_failure</code>, <code>finally_steps</code> (tableaux
        d'étapes). Chaque étape suit le DSL FoxRunner.
      </p>
      <app-json-editor
        label="Définition"
        [value]="definition()"
        (valueChange)="onDefinitionChange($event)"
        (validChange)="jsonValid.set($event)"
        [rows]="20"
      />
    </p-card>

    <app-form-footer
      [loading]="saving()"
      [disabled]="form.invalid || !jsonValid() || saving()"
      (save)="save()"
      (cancelled)="onCancel()"
    />
  `,
})
export class ScenarioEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ScenariosService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly scenarioId = signal<string>('');
  readonly isEdit = computed(() => this.scenarioId() !== '');
  readonly saving = signal(false);
  readonly jsonValid = signal(true);
  readonly definition = signal<Record<string, unknown>>(EMPTY_DEFINITION);
  private latestDefinition: Record<string, unknown> = EMPTY_DEFINITION;
  private idempotencyKey = '';

  readonly form = this.fb.nonNullable.group({
    scenario_id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_\-.]+$/)]],
    description: [''],
    owner_user_id: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.scenarioId.set(id);
      void this.loadExisting(id);
    } else {
      const me = this.auth.currentUser();
      this.form.patchValue({ owner_user_id: me?.email ?? '' });
      this.idempotencyKey = newIdempotencyKey();
    }
  }

  private async loadExisting(id: string): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    try {
      const s: ScenarioDetail = await this.service.get(me.id, id);
      this.form.patchValue({
        scenario_id: s.scenario_id,
        description: s.description,
        owner_user_id: s.owner_user_id,
      });
      this.form.controls.scenario_id.disable();
      this.latestDefinition = (s.definition ?? EMPTY_DEFINITION) as Record<string, unknown>;
      this.definition.set(this.latestDefinition);
    } catch {
      /* toast */
    }
  }

  onDefinitionChange(v: unknown): void {
    this.latestDefinition = (v ?? {}) as Record<string, unknown>;
  }

  onCancel(): void {
    this.router.navigate(['/scenarios']);
  }

  async save(): Promise<void> {
    if (this.form.invalid || !this.jsonValid()) return;
    this.saving.set(true);
    try {
      const values = this.form.getRawValue();
      if (this.isEdit()) {
        await this.service.patch(this.scenarioId(), {
          description: values.description,
          owner_user_id: values.owner_user_id,
          definition: this.latestDefinition,
        });
        this.messages.add({
          severity: 'success',
          summary: 'Scénario mis à jour',
          detail: this.scenarioId(),
          life: 3000,
        });
        this.router.navigate(['/scenarios', this.scenarioId()]);
      } else {
        const created = await this.service.create(
          {
            scenario_id: values.scenario_id,
            owner_user_id: values.owner_user_id,
            description: values.description,
            definition: this.latestDefinition,
          },
          this.idempotencyKey,
        );
        this.messages.add({
          severity: 'success',
          summary: 'Scénario créé',
          detail: created.scenario_id,
          life: 3000,
        });
        // Regenerate idempotency key for a follow-up creation.
        this.idempotencyKey = newIdempotencyKey();
        this.router.navigate(['/scenarios', created.scenario_id]);
      }
    } catch {
      /* toast */
    } finally {
      this.saving.set(false);
    }
  }
}
