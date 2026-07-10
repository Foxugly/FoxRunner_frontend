import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { GraphService } from '../../../core/api/graph.service';
import type { GraphNotification, GraphSubscription } from '../../../core/api/types';
import { ApiDatePipe } from '../../../shared/pipes/api-date.pipe';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-graph',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    TableModule,
    TabsModule,
    CardModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    DatePickerModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    ApiDatePipe,
    EmptyStateComponent,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header icon="pi-cloud" [title]="'admin.graph.title' | transloco">
      <p-button
        slot="left"
        icon="pi pi-arrow-left"
        [label]="'admin.common.back' | transloco"
        [outlined]="true"
        severity="secondary"
        routerLink="/admin"
      />
    </app-page-header>

    <p-tabs value="subs">
      <p-tablist>
        <p-tab value="subs">{{ 'admin.graph.tab_subs' | transloco: { count: subsTotal() } }}</p-tab>
        <p-tab value="notifs">{{ 'admin.graph.tab_notifs' | transloco: { count: notifsTotal() } }}</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="subs">
          <div class="flex justify-content-end mb-2 gap-2">
            <p-button
              icon="pi pi-refresh"
              severity="secondary"
              [text]="true"
              [loading]="subsLoading()"
              (onClick)="reloadSubs()"
            />
            <p-button
              [label]="'admin.graph.create_button' | transloco"
              icon="pi pi-plus"
              (onClick)="openCreate()"
            />
          </div>
          <p-table
            [value]="subs()"
            [lazy]="true"
            [paginator]="true"
            [rows]="subsRows()"
            [first]="subsFirst()"
            [totalRecords]="subsTotal()"
            [loading]="subsLoading()"
            (onLazyLoad)="onSubsLoad($event)"
            [rowsPerPageOptions]="[10, 25, 50]"
            dataKey="subscription_id"
            styleClass="p-datatable-sm"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>{{ 'admin.graph.col_id' | transloco }}</th>
                <th>{{ 'admin.graph.col_resource' | transloco }}</th>
                <th style="width: 9rem">{{ 'admin.graph.col_type' | transloco }}</th>
                <th style="width: 14rem">{{ 'admin.graph.col_expires' | transloco }}</th>
                <th style="width: 9rem">{{ 'admin.graph.col_actions' | transloco }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-s>
              <tr>
                <td><code class="text-xs">{{ s.subscription_id }}</code></td>
                <td class="text-xs">{{ s.resource }}</td>
                <td><p-tag severity="secondary" [value]="s.change_type" /></td>
                <td>
                  <div>{{ s.expiration_datetime | apiDate: 'medium' }}</div>
                  @if (isExpiringSoon(s)) {
                    <p-tag severity="warn" [value]="'admin.graph.expiring_soon' | transloco" />
                  }
                </td>
                <td>
                  <div class="flex gap-1">
                    <p-button
                      icon="pi pi-refresh"
                      [rounded]="true"
                      [text]="true"
                      size="small"
                      [pTooltip]="'admin.graph.tooltip_renew' | transloco"
                      (onClick)="openRenew(s)"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="true"
                      [text]="true"
                      size="small"
                      severity="danger"
                      [pTooltip]="'admin.graph.tooltip_delete' | transloco"
                      (onClick)="askDelete(s)"
                    />
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="5">
                  <app-empty-state
                    icon="pi-cloud"
                    [title]="'admin.graph.subs_empty_title' | transloco"
                    [message]="'admin.graph.subs_empty_message' | transloco"
                  />
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabpanel>

        <p-tabpanel value="notifs">
          <div class="flex justify-content-end mb-2">
            <p-button
              icon="pi pi-refresh"
              severity="secondary"
              [text]="true"
              [loading]="notifsLoading()"
              (onClick)="reloadNotifs()"
            />
          </div>
          <p-table
            [value]="notifs()"
            [lazy]="true"
            [paginator]="true"
            [rows]="notifsRows()"
            [first]="notifsFirst()"
            [totalRecords]="notifsTotal()"
            [loading]="notifsLoading()"
            (onLazyLoad)="onNotifsLoad($event)"
            [rowsPerPageOptions]="[20, 50, 100]"
            dataKey="id"
            styleClass="p-datatable-sm"
          >
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 14rem">{{ 'admin.graph.col_received' | transloco }}</th>
                <th>{{ 'admin.graph.col_subscription' | transloco }}</th>
                <th style="width: 9rem">{{ 'admin.graph.col_change' | transloco }}</th>
                <th>{{ 'admin.graph.col_resource' | transloco }}</th>
                <th>{{ 'admin.graph.col_lifecycle' | transloco }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-n>
              <tr>
                <td>{{ n.created_at | apiDate: 'medium' }}</td>
                <td><code class="text-xs">{{ n.subscription_id }}</code></td>
                <td><p-tag severity="secondary" [value]="n.change_type" /></td>
                <td class="text-xs">{{ n.resource }}</td>
                <td>{{ n.lifecycle_event || '—' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="5">
                  <app-empty-state icon="pi-inbox" [title]="'admin.graph.notifs_empty_title' | transloco" />
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabpanel>
      </p-tabpanels>
    </p-tabs>

    <p-dialog
      [modal]="true"
      [(visible)]="createOpen"
      [header]="'admin.graph.create_dialog_title' | transloco"
      [style]="{ width: '600px' }"
      [closable]="!saving()"
    >
      <form [formGroup]="createForm" class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="resource">{{ 'admin.graph.label_resource' | transloco }}</label>
          <input
            id="resource"
            pInputText
            formControlName="resource"
            placeholder="/me/messages"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="change_type">{{ 'admin.graph.label_change_type' | transloco }}</label>
          <input
            id="change_type"
            pInputText
            formControlName="change_type"
            placeholder="created,updated"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="notification_url">{{ 'admin.graph.label_notification_url' | transloco }}</label>
          <input
            id="notification_url"
            pInputText
            formControlName="notification_url"
            placeholder="https://…/graph/webhook"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="lifecycle_url">{{ 'admin.graph.label_lifecycle_url' | transloco }}</label>
          <input
            id="lifecycle_url"
            pInputText
            formControlName="lifecycle_notification_url"
            placeholder="https://…/graph/lifecycle"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="expires">{{ 'admin.graph.label_expires' | transloco }}</label>
          <p-datepicker
            inputId="expires"
            formControlName="expiration_datetime"
            [showTime]="true"
            hourFormat="24"
            appendTo="body"
          />
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button
          [label]="'admin.common.cancel' | transloco"
          severity="secondary"
          [text]="true"
          (onClick)="createOpen = false"
          [disabled]="saving()"
        />
        <p-button
          [label]="'admin.graph.create_submit' | transloco"
          icon="pi pi-plus"
          [loading]="saving()"
          [disabled]="createForm.invalid || saving()"
          (onClick)="create()"
        />
      </ng-template>
    </p-dialog>

    <p-dialog
      [modal]="true"
      [(visible)]="renewOpen"
      [header]="'admin.graph.renew_dialog_title' | transloco"
      [style]="{ width: '460px' }"
    >
      <div class="flex flex-column gap-3">
        <div class="text-color-secondary">
          {{ 'admin.graph.renew_text' | transloco }}
          <code>{{ renewTarget()?.subscription_id }}</code>.
        </div>
        <p-datepicker
          [(ngModel)]="renewDate"
          [showTime]="true"
          hourFormat="24"
          appendTo="body"
        />
      </div>
      <ng-template pTemplate="footer">
        <p-button
          [label]="'admin.common.cancel' | transloco"
          severity="secondary"
          [text]="true"
          (onClick)="renewOpen = false"
        />
        <p-button
          [label]="'admin.graph.renew_submit' | transloco"
          icon="pi pi-refresh"
          [loading]="saving()"
          [disabled]="!renewDate || saving()"
          (onClick)="runRenew()"
        />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class AdminGraphComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(GraphService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly i18n = inject(TranslocoService);

  readonly subs = signal<GraphSubscription[]>([]);
  readonly subsTotal = signal(0);
  readonly subsRows = signal(25);
  readonly subsFirst = signal(0);
  readonly subsLoading = signal(false);

  readonly notifs = signal<GraphNotification[]>([]);
  readonly notifsTotal = signal(0);
  readonly notifsRows = signal(50);
  readonly notifsFirst = signal(0);
  readonly notifsLoading = signal(false);

  readonly saving = signal(false);
  createOpen = false;
  renewOpen = false;
  readonly renewTarget = signal<GraphSubscription | null>(null);
  renewDate: Date | null = null;

  readonly createForm = this.fb.nonNullable.group({
    resource: ['', [Validators.required]],
    change_type: ['created,updated', [Validators.required]],
    notification_url: ['', [Validators.required]],
    lifecycle_notification_url: [''],
    expiration_datetime: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
  });

  ngOnInit(): void {
    void this.loadSubs(0, this.subsRows());
    void this.loadNotifs(0, this.notifsRows());
  }

  onSubsLoad(ev: TableLazyLoadEvent): void {
    const first = ev.first ?? 0;
    const rows = ev.rows ?? this.subsRows();
    this.subsFirst.set(first);
    this.subsRows.set(rows);
    void this.loadSubs(first, rows);
  }

  reloadSubs(): void {
    void this.loadSubs(this.subsFirst(), this.subsRows());
  }

  onNotifsLoad(ev: TableLazyLoadEvent): void {
    const first = ev.first ?? 0;
    const rows = ev.rows ?? this.notifsRows();
    this.notifsFirst.set(first);
    this.notifsRows.set(rows);
    void this.loadNotifs(first, rows);
  }

  reloadNotifs(): void {
    void this.loadNotifs(this.notifsFirst(), this.notifsRows());
  }

  private async loadSubs(offset: number, limit: number): Promise<void> {
    this.subsLoading.set(true);
    try {
      const page = await this.service.listSubscriptions(limit, offset);
      this.subs.set(page.items);
      this.subsTotal.set(page.total);
    } catch {
      /* toast */
    } finally {
      this.subsLoading.set(false);
    }
  }

  private async loadNotifs(offset: number, limit: number): Promise<void> {
    this.notifsLoading.set(true);
    try {
      const page = await this.service.listNotifications(limit, offset);
      this.notifs.set(page.items);
      this.notifsTotal.set(page.total);
    } catch {
      /* toast */
    } finally {
      this.notifsLoading.set(false);
    }
  }

  isExpiringSoon(s: GraphSubscription): boolean {
    if (!s.expiration_datetime) return false;
    const ts = new Date(s.expiration_datetime).getTime();
    return ts - Date.now() < 24 * 3600 * 1000;
  }

  openCreate(): void {
    const inOneHour = new Date(Date.now() + 3600 * 1000);
    this.createForm.reset({
      resource: '',
      change_type: 'created,updated',
      notification_url: '',
      lifecycle_notification_url: '',
      expiration_datetime: inOneHour,
    });
    this.createOpen = true;
  }

  async create(): Promise<void> {
    if (this.createForm.invalid) return;
    this.saving.set(true);
    try {
      const v = this.createForm.getRawValue();
      if (!v.expiration_datetime) return;
      await this.service.createSubscription({
        resource: v.resource,
        change_type: v.change_type,
        notification_url: v.notification_url,
        lifecycle_notification_url: v.lifecycle_notification_url || null,
        expiration_datetime: v.expiration_datetime.toISOString(),
      });
      this.messages.add({
        severity: 'success',
        summary: this.i18n.translate('admin.graph.toast_created'),
        life: 2500,
      });
      this.createOpen = false;
      this.reloadSubs();
    } catch {
      /* toast */
    } finally {
      this.saving.set(false);
    }
  }

  openRenew(s: GraphSubscription): void {
    this.renewTarget.set(s);
    const base = s.expiration_datetime ? new Date(s.expiration_datetime) : new Date();
    base.setHours(base.getHours() + 24);
    this.renewDate = base;
    this.renewOpen = true;
  }

  async runRenew(): Promise<void> {
    const target = this.renewTarget();
    if (!target || !this.renewDate) return;
    this.saving.set(true);
    try {
      await this.service.renewSubscription(target.subscription_id, {
        expiration_datetime: this.renewDate.toISOString(),
      });
      this.messages.add({
        severity: 'success',
        summary: this.i18n.translate('admin.graph.toast_renewed'),
        life: 2500,
      });
      this.renewOpen = false;
      this.reloadSubs();
    } catch {
      /* toast */
    } finally {
      this.saving.set(false);
    }
  }

  askDelete(s: GraphSubscription): void {
    this.confirm.confirm({
      header: this.i18n.translate('admin.graph.delete_header'),
      message: this.i18n.translate('admin.graph.delete_message', { id: s.subscription_id }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.translate('admin.common.delete'),
      rejectLabel: this.i18n.translate('admin.common.cancel'),
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        try {
          await this.service.deleteSubscription(s.subscription_id);
          this.messages.add({
            severity: 'success',
            summary: this.i18n.translate('admin.graph.toast_deleted'),
            life: 2500,
          });
          this.reloadSubs();
        } catch {
          /* toast */
        }
      },
    });
  }
}
