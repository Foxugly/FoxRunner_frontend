import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import { newIdempotencyKey } from '../../../core/utils/idempotency';
import type { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import { FormFooterComponent } from '../../../shared/components/form-footer/form-footer.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/** A fresh scenario starts empty; steps are added afterwards from the "Étapes"
 * tab of the detail page (no raw-JSON definition editor here anymore). */
const EMPTY_DEFINITION = {
  before_steps: [],
  steps: [],
  on_success: [],
  on_failure: [],
  finally_steps: [],
};

/**
 * Scenario creation form (`/scenarios/new`). Metadata only — id, description,
 * owner. The definition is seeded empty and the steps are edited inline in the
 * scenario's "Étapes" tab. There is no standalone edit page anymore: existing
 * scenarios are edited in place on the detail view.
 */
@Component({
  selector: 'app-scenario-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    FormFooterComponent,
    PageHeaderComponent,
    TranslocoPipe,
  ],
  template: `
    <app-page-header icon="pi-plus" [title]="'scenarios.edit.title' | transloco" />

    <p-card>
      <h3 class="builder-section-title">{{ 'scenarios.edit.section_info' | transloco }}</h3>
      <form [formGroup]="form" class="meta-grid cols-2">
        <div class="meta-item">
          <label class="meta-label" for="scenario_id">{{ 'scenarios.edit.id_label' | transloco }}</label>
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
          <label class="meta-label" for="owner">{{ 'scenarios.edit.owner_label' | transloco }}</label>
          <div class="meta-value">
            <input
              id="owner"
              pInputText
              formControlName="owner_user_id"
              [placeholder]="'scenarios.common.owner_placeholder' | transloco"
            />
          </div>
        </div>
        <div class="meta-item meta-item--full">
          <label class="meta-label" for="description">{{ 'scenarios.edit.description_label' | transloco }}</label>
          <div class="meta-value">
            <textarea
              id="description"
              pTextarea
              rows="3"
              formControlName="description"
              [placeholder]="'scenarios.common.description_placeholder' | transloco"
            ></textarea>
          </div>
        </div>
      </form>
      <p class="edit-hint">
        {{ 'scenarios.edit.steps_hint' | transloco }}
      </p>
    </p-card>

    <app-form-footer
      [saveLabel]="'scenarios.edit.create' | transloco"
      [loading]="saving()"
      [disabled]="form.invalid || saving()"
      (save)="save()"
      (cancelled)="onCancel()"
    />
  `,
  styles: [
    `
      .edit-hint {
        color: var(--muted);
        font-size: 0.875rem;
        margin-top: 0.5rem;
        margin-bottom: 0;
      }
    `,
  ],
})
export class ScenarioEditComponent implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ScenariosService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

  readonly saving = signal(false);
  private idempotencyKey = '';
  /** Set when navigating away intentionally (save/cancel), to skip the guard. */
  private leaving = false;

  readonly form = this.fb.nonNullable.group({
    scenario_id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_\-.]+$/)]],
    description: [''],
    owner_user_id: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const me = this.auth.currentUser();
    this.form.patchValue({ owner_user_id: me?.email ?? '' });
    this.idempotencyKey = newIdempotencyKey();
  }

  onCancel(): void {
    this.leaving = true;
    this.router.navigate(['/scenarios']);
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.leaving;
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      const values = this.form.getRawValue();
      const created = await this.service.create(
        {
          scenario_id: values.scenario_id,
          owner_user_id: values.owner_user_id,
          description: values.description,
          definition: EMPTY_DEFINITION,
        },
        this.idempotencyKey,
      );
      this.messages.add({
        severity: 'success',
        summary: this.transloco.translate('scenarios.toast.created'),
        detail: created.scenario_id,
        life: 3000,
      });
      // Regenerate the idempotency key in case the user creates another.
      this.idempotencyKey = newIdempotencyKey();
      this.leaving = true;
      this.router.navigate(['/scenarios', created.scenario_id]);
    } catch {
      /* errors surfaced by the HTTP interceptor */
    } finally {
      this.saving.set(false);
    }
  }
}
