import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PushItTargetsService } from '../../core/api/pushit-targets.service';
import type { PushItTarget } from '../../core/api/types';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FormFooterComponent } from '../../shared/components/form-footer/form-footer.component';

@Component({
  selector: 'app-pushit-targets',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    TableModule,
    TagModule,
    TooltipModule,
    EmptyStateComponent,
    FormFooterComponent,
    TranslocoPipe,
  ],
  template: `
    <p-card>
      <ng-template #header>
        <div class="card-head">
          <div class="head-titles">
            <span class="card-title">
              <i class="pi pi-bell"></i>{{ 'profile.pushit.title' | transloco }}
            </span>
            <small class="muted">
              {{ 'profile.pushit.subtitle_before' | transloco }} <code>notify</code>{{ 'profile.pushit.subtitle_after' | transloco }}
            </small>
          </div>
          <p-button
            [label]="'profile.pushit.add' | transloco"
            icon="pi pi-plus"
            severity="success"
            size="small"
            (onClick)="openCreate()"
          />
        </div>
      </ng-template>

      @if (loading() || targets().length > 0) {
      <p-table
        [value]="targets()"
        [loading]="loading()"
        styleClass="p-datatable-sm"
      >
        <ng-template #header>
          <tr>
            <th>{{ 'profile.pushit.table.name' | transloco }}</th>
            <th>{{ 'profile.pushit.table.token' | transloco }}</th>
            <th>{{ 'profile.pushit.table.title' | transloco }}</th>
            <th>{{ 'profile.pushit.table.default' | transloco }}</th>
            <th class="cell-right">{{ 'profile.pushit.table.actions' | transloco }}</th>
          </tr>
        </ng-template>
        <ng-template #body let-t>
          <tr>
            <td>{{ t.name }}</td>
            <td><code>{{ mask(t.app_token) }}</code></td>
            <td>{{ t.title }}</td>
            <td>
              @if (t.is_default) {
                <p-tag [value]="'profile.pushit.default_tag' | transloco" severity="success" />
              }
            </td>
            <td class="actions-cell">
              <p-button
                icon="pi pi-send"
                severity="secondary"
                [text]="true"
                size="small"
                [pTooltip]="'profile.pushit.test' | transloco"
                [loading]="testingId() === t.id"
                (onClick)="test(t)"
              />
              <p-button
                icon="pi pi-pencil"
                severity="secondary"
                [text]="true"
                size="small"
                (onClick)="openEdit(t)"
              />
              <p-button
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                size="small"
                (onClick)="confirmId.set(t.id)"
              />
            </td>
          </tr>
        </ng-template>
      </p-table>
      } @else {
        <app-empty-state
          icon="pi-bell"
          [title]="'profile.pushit.empty.title' | transloco"
          [subtitle]="'profile.pushit.empty.subtitle' | transloco"
        >
          <p-button
            [label]="'profile.pushit.add' | transloco"
            icon="pi pi-plus"
            severity="success"
            size="small"
            (onClick)="openCreate()"
          />
        </app-empty-state>
      }
    </p-card>

    <!-- Create / edit dialog -->
    <p-dialog
      [visible]="dialogOpen()"
      (visibleChange)="onDialogVisible($event)"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [header]="dialogHeader()"
    >
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="meta-grid">
          <div class="meta-item">
            <label class="meta-label" for="pit-name">{{ 'profile.pushit.form.name' | transloco }}</label>
            <div class="meta-value">
              <input id="pit-name" pInputText formControlName="name" [placeholder]="'profile.pushit.form.name_placeholder' | transloco" />
            </div>
          </div>
          <div class="meta-item">
            <label class="meta-label" for="pit-token">{{ 'profile.pushit.form.token' | transloco }}</label>
            <div class="meta-value">
              <input id="pit-token" pInputText formControlName="app_token" [placeholder]="'profile.pushit.form.token_placeholder' | transloco" />
            </div>
          </div>
          <div class="meta-item">
            <label class="meta-label" for="pit-base">{{ 'profile.pushit.form.base_url' | transloco }}</label>
            <div class="meta-value">
              <input id="pit-base" pInputText formControlName="base_url" />
            </div>
          </div>
          <div class="meta-item">
            <label class="meta-label" for="pit-title">{{ 'profile.pushit.form.title' | transloco }}</label>
            <div class="meta-value">
              <input id="pit-title" pInputText formControlName="title" />
            </div>
          </div>
          <div class="meta-item">
            <span class="meta-label">{{ 'profile.pushit.form.default' | transloco }}</span>
            <div class="meta-value">
              <p-checkbox inputId="pit-default" formControlName="is_default" [binary]="true" />
            </div>
          </div>
        </div>
      </form>
      <ng-template #footer>
        <app-form-footer
          [loading]="saving()"
          [disabled]="form.invalid || saving()"
          (save)="save()"
          (cancelled)="closeDialog()"
        />
      </ng-template>
    </p-dialog>

    <!-- Delete confirm dialog -->
    <p-dialog
      [visible]="confirmId() !== null"
      (visibleChange)="$event || confirmId.set(null)"
      [modal]="true"
      [style]="{ width: '26rem' }"
      [header]="'profile.pushit.delete.title' | transloco"
    >
      <p>{{ 'profile.pushit.delete.body' | transloco }}</p>
      <ng-template #footer>
        <p-button [label]="'profile.pushit.delete.cancel' | transloco" severity="secondary" [text]="true" (onClick)="confirmId.set(null)" />
        <p-button [label]="'profile.pushit.delete.confirm' | transloco" icon="pi pi-trash" severity="danger" (onClick)="remove()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      .card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
      }
      .head-titles {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .card-title {
        font-weight: 600;
      }
      .card-title i {
        margin-right: 0.5rem;
      }
      .muted {
        color: var(--muted);
      }
      .cell-right {
        text-align: right;
      }
      .actions-cell {
        text-align: right;
        white-space: nowrap;
      }
    `,
  ],
})
export class PushItTargetsComponent implements OnInit {
  private readonly service = inject(PushItTargetsService);
  private readonly messages = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly transloco = inject(TranslocoService);

  readonly targets = signal<PushItTarget[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly dialogOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly confirmId = signal<number | null>(null);
  readonly testingId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    app_token: ['', Validators.required],
    base_url: ['https://pushit-api.foxugly.com/api/v1', Validators.required],
    title: ['FoxRunner', Validators.required],
    is_default: [false],
  });

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  dialogHeader(): string {
    return this.transloco.translate(
      this.editingId() === null ? 'profile.pushit.dialog.create' : 'profile.pushit.dialog.edit',
    );
  }

  mask(token: string): string {
    if (token.length <= 6) return '••••';
    return `${token.slice(0, 4)}…${token.slice(-2)}`;
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      this.targets.set(await this.service.list());
    } catch {
      /* interceptor toasts */
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      app_token: '',
      base_url: 'https://pushit-api.foxugly.com/api/v1',
      title: 'FoxRunner',
      is_default: false,
    });
    this.dialogOpen.set(true);
  }

  openEdit(t: PushItTarget): void {
    this.editingId.set(t.id);
    this.form.reset({
      name: t.name,
      app_token: t.app_token,
      base_url: t.base_url,
      title: t.title,
      is_default: t.is_default,
    });
    this.dialogOpen.set(true);
  }

  onDialogVisible(visible: boolean): void {
    if (!visible) this.closeDialog();
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    const dto = this.form.getRawValue();
    const id = this.editingId();
    try {
      if (id === null) {
        await this.service.create(dto);
        this.messages.add({ severity: 'success', summary: this.transloco.translate('profile.pushit.toast.created'), life: 3000 });
      } else {
        await this.service.update(id, dto);
        this.messages.add({ severity: 'success', summary: this.transloco.translate('profile.pushit.toast.updated'), life: 3000 });
      }
      this.dialogOpen.set(false);
      await this.reload();
    } catch {
      /* interceptor toasts */
    } finally {
      this.saving.set(false);
    }
  }

  async remove(): Promise<void> {
    const id = this.confirmId();
    if (id === null) return;
    try {
      await this.service.remove(id);
      this.messages.add({ severity: 'success', summary: this.transloco.translate('profile.pushit.toast.deleted'), life: 3000 });
      await this.reload();
    } catch {
      /* interceptor toasts */
    } finally {
      this.confirmId.set(null);
    }
  }

  async test(t: PushItTarget): Promise<void> {
    this.testingId.set(t.id);
    try {
      const result = await this.service.test(t.id);
      this.messages.add(
        result.sent
          ? { severity: 'success', summary: this.transloco.translate('profile.pushit.toast.test_sent'), detail: t.name, life: 3000 }
          : {
              severity: 'warn',
              summary: this.transloco.translate('profile.pushit.toast.test_failed'),
              detail: this.transloco.translate('profile.pushit.toast.test_failed_detail'),
              life: 4000,
            },
      );
    } catch {
      /* interceptor toasts */
    } finally {
      this.testingId.set(null);
    }
  }
}
