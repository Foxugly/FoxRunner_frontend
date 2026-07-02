import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
    <app-page-header
      icon="pi-cloud"
      title="Microsoft Graph"
      [backLink]="'/admin'"
    >
    </app-page-header>

    <p-tabs value="subs">
      <p-tablist>
        <p-tab value="subs">Abonnements ({{ subsTotal() }})</p-tab>
        <p-tab value="notifs">Notifications ({{ notifsTotal() }})</p-tab>
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
              label="Créer un abonnement"
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
                <th>ID</th>
                <th>Ressource</th>
                <th style="width: 9rem">Type</th>
                <th style="width: 14rem">Expire le</th>
                <th style="width: 9rem">Actions</th>
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
                    <p-tag severity="warn" value="Expire bientôt" />
                  }
                </td>
                <td>
                  <div class="flex gap-1">
                    <p-button
                      icon="pi pi-refresh"
                      [rounded]="true"
                      [text]="true"
                      size="small"
                      pTooltip="Renouveler"
                      (onClick)="openRenew(s)"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="true"
                      [text]="true"
                      size="small"
                      severity="danger"
                      pTooltip="Supprimer"
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
                    title="Aucun abonnement"
                    message="Crée un abonnement Graph pour recevoir des notifications."
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
                <th style="width: 14rem">Reçu</th>
                <th>Subscription</th>
                <th style="width: 9rem">Change</th>
                <th>Ressource</th>
                <th>Lifecycle</th>
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
                  <app-empty-state icon="pi-inbox" title="Aucune notification" />
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
      header="Créer un abonnement Graph"
      [style]="{ width: '600px' }"
      [closable]="!saving()"
    >
      <form [formGroup]="createForm" class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="resource">Ressource</label>
          <input
            id="resource"
            pInputText
            formControlName="resource"
            placeholder="/me/messages"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="change_type">Change type</label>
          <input
            id="change_type"
            pInputText
            formControlName="change_type"
            placeholder="created,updated"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="notification_url">Notification URL</label>
          <input
            id="notification_url"
            pInputText
            formControlName="notification_url"
            placeholder="https://…/graph/webhook"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="lifecycle_url">Lifecycle URL (optionnel)</label>
          <input
            id="lifecycle_url"
            pInputText
            formControlName="lifecycle_notification_url"
            placeholder="https://…/graph/lifecycle"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="expires">Expire le</label>
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
          label="Annuler"
          severity="secondary"
          [text]="true"
          (onClick)="createOpen = false"
          [disabled]="saving()"
        />
        <p-button
          label="Créer"
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
      header="Renouveler l'abonnement"
      [style]="{ width: '460px' }"
    >
      <div class="flex flex-column gap-3">
        <div class="text-color-secondary">
          Nouvelle date d'expiration pour
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
          label="Annuler"
          severity="secondary"
          [text]="true"
          (onClick)="renewOpen = false"
        />
        <p-button
          label="Renouveler"
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
        summary: 'Abonnement créé',
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
        summary: 'Abonnement renouvelé',
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
      header: `Supprimer l'abonnement ?`,
      message: `${s.subscription_id} ne recevra plus de notifications.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        try {
          await this.service.deleteSubscription(s.subscription_id);
          this.messages.add({
            severity: 'success',
            summary: 'Abonnement supprimé',
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
