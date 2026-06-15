import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
    CardModule,
    ButtonModule,
    InputNumberModule,
    ConfirmDialogModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      icon="pi-trash"
      title="Rétention"
    >
      <p-button
        label="Retour admin"
        icon="pi pi-arrow-left"
        severity="secondary"
        [text]="true"
        routerLink="/admin"
      />
    </app-page-header>

    <p-card styleClass="max-w-30rem">
      <form [formGroup]="form" class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="jobs">Jobs plus anciens que (jours)</label>
          <p-inputnumber
            inputId="jobs"
            formControlName="jobs_days"
            [min]="0"
            [max]="3650"
            suffix=" j"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="audit">Audit plus ancien que (jours)</label>
          <p-inputnumber
            inputId="audit"
            formControlName="audit_days"
            [min]="0"
            [max]="3650"
            suffix=" j"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="graph">Notifications Graph plus anciennes que (jours)</label>
          <p-inputnumber
            inputId="graph"
            formControlName="graph_notifications_days"
            [min]="0"
            [max]="3650"
            suffix=" j"
          />
        </div>
        <div class="flex gap-2">
          <p-button
            label="Exécuter la purge"
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
      <p-card styleClass="mt-3" header="Résultat de la dernière purge">
        <ul>
          @for (entry of removedEntries(r); track entry.key) {
            <li>
              <strong>{{ entry.key }} :</strong> {{ entry.count }} lignes supprimées
            </li>
          }
        </ul>
      </p-card>
    }

    <p-confirmDialog />
  `,
})
export class AdminRetentionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdminService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

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
      header: 'Confirmer la purge',
      message:
        'Cette action supprime définitivement les lignes correspondantes. Continuer ?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Purger',
      rejectLabel: 'Annuler',
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
        summary: 'Purge effectuée',
        detail: 'Voir le résultat ci-dessous.',
        life: 3000,
      });
    } catch {
      /* toast */
    } finally {
      this.running.set(false);
    }
  }
}
