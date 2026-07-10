import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { AdminService } from '../../../core/api/admin.service';
import type { RetentionResult } from '../../../core/api/types';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-retention',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    CardModule,
    ButtonModule,
    InputNumberModule,
    ConfirmDialogModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header icon="pi-trash" [title]="'admin.retention.title' | transloco">
      <p-button
        slot="left"
        icon="pi pi-arrow-left"
        [label]="'admin.common.back' | transloco"
        [outlined]="true"
        severity="secondary"
        routerLink="/admin"
      />
    </app-page-header>

    <p-card styleClass="card-narrow">
      <form [formGroup]="form" class="form-stack">
        <div class="field">
          <label for="jobs">{{ 'admin.retention.label_jobs' | transloco }}</label>
          <p-inputnumber
            inputId="jobs"
            formControlName="jobs_days"
            [min]="0"
            [max]="3650"
            [suffix]="'admin.common.day_suffix' | transloco"
          />
        </div>
        <div class="field">
          <label for="audit">{{ 'admin.retention.label_audit' | transloco }}</label>
          <p-inputnumber
            inputId="audit"
            formControlName="audit_days"
            [min]="0"
            [max]="3650"
            [suffix]="'admin.common.day_suffix' | transloco"
          />
        </div>
        <div class="field">
          <label for="graph">{{ 'admin.retention.label_graph' | transloco }}</label>
          <p-inputnumber
            inputId="graph"
            formControlName="graph_notifications_days"
            [min]="0"
            [max]="3650"
            [suffix]="'admin.common.day_suffix' | transloco"
          />
        </div>
        <div class="actions">
          <p-button
            [label]="'admin.retention.run_button' | transloco"
            icon="pi pi-trash"
            severity="danger"
            [loading]="running()"
            [disabled]="running() || form.invalid"
            (onClick)="askRun()"
          />
        </div>
      </form>
    </p-card>

    @if (result(); as r) {
      <p-card styleClass="card-spaced" [header]="'admin.retention.result_title' | transloco">
        <ul>
          @for (entry of removedEntries(r); track entry.key) {
            <li>
              <strong>{{ entry.key }} :</strong>
              {{ 'admin.retention.rows_removed' | transloco: { count: entry.count } }}
            </li>
          }
        </ul>
      </p-card>
    }

    <p-confirmDialog />
  `,
  styleUrl: './admin-retention.component.scss',
})
export class AdminRetentionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly i18n = inject(TranslocoService);

  readonly running = signal(false);
  readonly result = signal<RetentionResult | null>(null);

  readonly form = this.fb.nonNullable.group({
    jobs_days: [30, [Validators.min(0)]],
    audit_days: [180, [Validators.min(0)]],
    graph_notifications_days: [30, [Validators.min(0)]],
  });

  removedEntries(r: RetentionResult): { key: string; count: number }[] {
    return Object.entries(r.removed).map(([key, count]) => ({
      key,
      count: Number(count),
    }));
  }

  askRun(): void {
    this.confirm.confirm({
      header: this.i18n.translate('admin.retention.confirm_header'),
      message: this.i18n.translate('admin.retention.confirm_message'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.translate('admin.retention.confirm_accept'),
      rejectLabel: this.i18n.translate('admin.common.cancel'),
      acceptButtonProps: { severity: 'danger' },
      accept: () => this.run(),
    });
  }

  private async run(): Promise<void> {
    this.running.set(true);
    try {
      const values = this.form.getRawValue();
      const r = await this.service.prune({
        jobs_days: values.jobs_days,
        audit_days: values.audit_days,
        graph_notifications_days: values.graph_notifications_days,
      });
      this.result.set(r);
      this.messages.add({
        severity: 'success',
        summary: this.i18n.translate('admin.retention.toast_done'),
        detail: this.i18n.translate('admin.retention.toast_detail'),
        life: 3000,
      });
    } catch {
      /* toast */
    } finally {
      this.running.set(false);
    }
  }
}
