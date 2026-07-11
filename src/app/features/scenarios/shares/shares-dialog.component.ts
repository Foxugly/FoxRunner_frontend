import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ScenariosService } from '../../../core/api/scenarios.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-shares-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    ConfirmDialogModule,
    EmptyStateComponent,
    TranslocoPipe,
  ],
  template: `
    <p-dialog
      [modal]="true"
      [visible]="visible"
      (visibleChange)="visibleChange.emit($event)"
      [header]="'scenarios.shares.header' | transloco"
      [style]="{ width: '560px' }"
      (onShow)="load()"
    >
      <div class="shares-stack">
        <div class="shares-add">
          <input
            pInputText
            [(ngModel)]="newUserId"
            [placeholder]="'scenarios.shares.add_placeholder' | transloco"
            class="shares-add__input"
            [disabled]="saving()"
          />
          <p-button
            [label]="'scenarios.shares.add' | transloco"
            icon="pi pi-plus"
            severity="success"
            [loading]="saving()"
            [disabled]="!newUserId || saving()"
            (onClick)="add()"
          />
        </div>

        @if (userIds().length === 0 && !loading()) {
          <app-empty-state
            icon="pi-share-alt"
            [title]="'scenarios.shares.empty_title' | transloco"
            [message]="'scenarios.shares.empty_message' | transloco"
          />
        } @else {
          <p-table [value]="userIds()" [loading]="loading()" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ 'scenarios.shares.col_user' | transloco }}</th>
                <th class="col--actions"></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-u>
              <tr>
                <td><code>{{ u }}</code></td>
                <td>
                  <p-button
                    icon="pi pi-times"
                    [rounded]="true"
                    [text]="true"
                    severity="danger"
                    size="small"
                    (onClick)="askRemove(u)"
                  />
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      </div>
      <ng-template pTemplate="footer">
        <p-button
          [label]="'scenarios.common.close' | transloco"
          severity="secondary"
          [text]="true"
          (onClick)="visibleChange.emit(false)"
        />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
  `,
  styleUrl: './shares-dialog.component.scss',
})
export class SharesDialogComponent {
  private readonly service = inject(ScenariosService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

  @Input({ required: true }) scenarioId = '';
  @Input() visible = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  readonly userIds = signal<string[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  newUserId = '';

  async load(): Promise<void> {
    if (!this.scenarioId) return;
    this.loading.set(true);
    try {
      const list = await this.service.getShares(this.scenarioId);
      this.userIds.set(list.user_ids);
    } catch {
      this.userIds.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async add(): Promise<void> {
    const target = this.newUserId.trim();
    if (!target) return;
    this.saving.set(true);
    try {
      await this.service.addShare(this.scenarioId, { user_id: target });
      this.messages.add({
        severity: 'success',
        summary: this.transloco.translate('scenarios.shares.toast_added'),
        detail: target,
        life: 2500,
      });
      this.newUserId = '';
      await this.load();
    } catch {
      /* toast */
    } finally {
      this.saving.set(false);
    }
  }

  askRemove(userId: string): void {
    this.confirm.confirm({
      header: this.transloco.translate('scenarios.shares.confirm_remove_header', { id: userId }),
      message: this.transloco.translate('scenarios.shares.confirm_remove_message'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.transloco.translate('scenarios.shares.remove_accept'),
      rejectLabel: this.transloco.translate('scenarios.common.cancel'),
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        try {
          await this.service.removeShare(this.scenarioId, userId);
          this.messages.add({
            severity: 'success',
            summary: this.transloco.translate('scenarios.shares.toast_removed'),
            detail: userId,
            life: 2500,
          });
          await this.load();
        } catch {
          /* toast */
        }
      },
    });
  }
}
