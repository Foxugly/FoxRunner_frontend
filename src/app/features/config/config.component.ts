import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { CatalogConfigService } from '../../core/api/catalog-config.service';
import type { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { FormFooterComponent } from '../../shared/components/form-footer/form-footer.component';
import { JsonEditorComponent } from '../../shared/components/json-editor/json-editor.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type PushoverEntry = Record<string, unknown>;

/**
 * Global catalogue configuration page (`/config`, superuser-only): the `data`
 * block of scenarios.json. Hybrid editing — defaults as dropdowns, pushovers as
 * structured cards (secrets masked / write-only), networks as a raw JSON editor.
 */
@Component({
  selector: 'app-config',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    PageHeaderComponent,
    FormFooterComponent,
    JsonEditorComponent,
  ],
  template: `
    <app-page-header icon="pi-server" [title]="'config.title' | transloco">
      <p-button
        slot="left"
        icon="pi pi-arrow-left"
        [label]="'config.back' | transloco"
        [outlined]="true"
        severity="secondary"
        routerLink="/admin"
      />
    </app-page-header>

    @if (loading()) {
      <p-card>
        <p-skeleton height="2rem" styleClass="skeleton-gap" />
        <p-skeleton height="2rem" width="60%" />
      </p-card>
    } @else {
      <p-card [header]="'config.defaults_title' | transloco">
        <div class="meta-grid cols-2">
          <div class="meta-item">
            <label class="meta-label" for="def-pushover">{{ 'config.default_pushover' | transloco }}</label>
            <div class="meta-value">
              <p-select
                inputId="def-pushover"
                [options]="pushoverKeys()"
                [(ngModel)]="defaultPushover"
                (ngModelChange)="dirty.set(true)"
                [showClear]="true"
                placeholder="—"
              />
            </div>
          </div>
          <div class="meta-item">
            <label class="meta-label" for="def-network">{{ 'config.default_network' | transloco }}</label>
            <div class="meta-value">
              <p-select
                inputId="def-network"
                [options]="networkKeys()"
                [(ngModel)]="defaultNetwork"
                (ngModelChange)="dirty.set(true)"
                [showClear]="true"
                placeholder="—"
              />
            </div>
          </div>
        </div>
      </p-card>

      <p-card styleClass="card-spaced">
        <ng-template pTemplate="header">
          <div class="card-head">
            <span class="card-title"><i class="pi pi-bell icon-gap"></i>{{ 'config.pushovers_title' | transloco }}</span>
            <p-button
              [label]="'config.add' | transloco"
              icon="pi pi-plus"
              severity="success"
              size="small"
              (onClick)="openPushover(null)"
            />
          </div>
        </ng-template>
        @if (pushoverKeys().length === 0) {
          <p class="empty-note">{{ 'config.none_configured' | transloco }}</p>
        } @else {
          <div class="entry-list">
            @for (key of pushoverKeys(); track key) {
              <div class="entry">
                <div class="entry-main">
                  <div class="entry-name">{{ key }}</div>
                  <div class="entry-meta">
                    <i class="pi pi-lock icon-gap-sm"></i>{{
                      'config.pushover_masked'
                        | transloco
                          : {
                              sound: pushovers()[key]['sound'] || '—',
                              timeout: pushovers()[key]['timeout_seconds'] ?? '—'
                            }
                    }}
                  </div>
                </div>
                <div class="entry-actions">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    [rounded]="true"
                    severity="secondary"
                    [ariaLabel]="'config.aria_edit' | transloco"
                    (onClick)="openPushover(key)"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    [rounded]="true"
                    severity="danger"
                    [ariaLabel]="'config.aria_delete' | transloco"
                    (onClick)="confirmRemovePushover(key)"
                  />
                </div>
              </div>
            }
          </div>
        }
      </p-card>

      <p-card styleClass="card-spaced" [header]="'config.networks_title' | transloco">
        <p class="section-desc">
          {{ 'config.networks_desc' | transloco }}
        </p>
        <app-json-editor
          [label]="'config.networks_label' | transloco"
          [value]="networks()"
          (valueChange)="onNetworksChange($event)"
          (validChange)="networksValid.set($event)"
          [rows]="18"
        />
      </p-card>

      <app-form-footer
        [loading]="saving()"
        [disabled]="!dirty() || !networksValid() || saving()"
        (save)="save()"
        (cancelled)="load()"
      />
    }

    <p-dialog
      [modal]="true"
      [(visible)]="pushoverDialogOpen"
      [header]="(editingKey() ? 'config.dialog_edit' : 'config.dialog_new') | transloco"
      [style]="{ width: '480px' }"
    >
      <div class="meta-grid">
        <div class="meta-item">
          <label class="meta-label" for="pk">{{ 'config.label_name' | transloco }}</label>
          <div class="meta-value">
            <input
              id="pk"
              pInputText
              [(ngModel)]="draftKey"
              [disabled]="editingKey() !== null"
              [placeholder]="'config.ph_name' | transloco"
            />
          </div>
        </div>
        <div class="meta-item">
          <label class="meta-label" for="ptok">{{ 'config.label_token' | transloco }}</label>
          <div class="meta-value">
            <input id="ptok" pInputText [(ngModel)]="draftToken" [placeholder]="'config.ph_token' | transloco" />
          </div>
        </div>
        <div class="meta-item">
          <label class="meta-label" for="pusr">{{ 'config.label_user_key' | transloco }}</label>
          <div class="meta-value">
            <input id="pusr" pInputText [(ngModel)]="draftUserKey" [placeholder]="'config.ph_user_key' | transloco" />
          </div>
        </div>
        <div class="meta-item">
          <label class="meta-label" for="psnd">{{ 'config.label_sound' | transloco }}</label>
          <div class="meta-value">
            <input id="psnd" pInputText [(ngModel)]="draftSound" [placeholder]="'config.ph_sound' | transloco" />
          </div>
        </div>
        <div class="meta-item">
          <label class="meta-label" for="pto">{{ 'config.label_timeout' | transloco }}</label>
          <div class="meta-value">
            <p-inputnumber inputId="pto" [(ngModel)]="draftTimeout" [min]="0" />
          </div>
        </div>
        <p class="meta-hint meta-item--full">
          {{ 'config.masked_hint' | transloco }}
        </p>
      </div>
      <ng-template pTemplate="footer">
        <app-form-footer
          [saveLabel]="'config.validate' | transloco"
          [disabled]="!draftKey.trim()"
          (save)="savePushover()"
          (cancelled)="pushoverDialogOpen = false"
        />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
  `,
  styleUrl: './config.component.scss',
})
export class ConfigComponent implements OnInit, HasUnsavedChanges {
  private readonly service = inject(CatalogConfigService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly i18n = inject(TranslocoService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  /** Pending, unsaved edits — drives the Save button and the leave guard. */
  readonly dirty = signal(false);

  defaultPushover = '';
  defaultNetwork = '';
  readonly pushovers = signal<Record<string, PushoverEntry>>({});
  readonly networks = signal<Record<string, unknown>>({});
  readonly networkKeys = signal<string[]>([]);
  readonly networksValid = signal(true);
  private latestNetworks: Record<string, unknown> = {};

  readonly pushoverKeys = computed(() => Object.keys(this.pushovers()));

  // Pushover add/edit dialog
  pushoverDialogOpen = false;
  readonly editingKey = signal<string | null>(null);
  draftKey = '';
  draftToken = '';
  draftUserKey = '';
  draftSound = '';
  draftTimeout: number | null = null;

  ngOnInit(): void {
    void this.load();
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const cfg = await this.service.get();
      this.applyConfig(cfg);
    } catch {
      /* errors surfaced by the HTTP interceptor */
    } finally {
      this.loading.set(false);
    }
  }

  private applyConfig(cfg: {
    default_pushover?: string;
    default_network?: string;
    pushovers?: Record<string, unknown>;
    networks?: Record<string, unknown>;
  }): void {
    this.defaultPushover = cfg.default_pushover ?? '';
    this.defaultNetwork = cfg.default_network ?? '';
    this.pushovers.set({ ...((cfg.pushovers ?? {}) as Record<string, PushoverEntry>) });
    const networks = { ...((cfg.networks ?? {}) as Record<string, unknown>) };
    this.networks.set(networks);
    this.latestNetworks = networks;
    this.networkKeys.set(Object.keys(networks));
    this.networksValid.set(true);
    this.dirty.set(false);
  }

  onNetworksChange(value: unknown): void {
    this.latestNetworks = (value ?? {}) as Record<string, unknown>;
    this.networkKeys.set(Object.keys(this.latestNetworks));
    this.dirty.set(true);
  }

  openPushover(key: string | null): void {
    this.editingKey.set(key);
    if (key) {
      const entry = this.pushovers()[key] ?? {};
      this.draftKey = key;
      this.draftToken = (entry['token'] as string) ?? '';
      this.draftUserKey = (entry['user_key'] as string) ?? '';
      this.draftSound = (entry['sound'] as string) ?? '';
      this.draftTimeout = (entry['timeout_seconds'] as number | null) ?? null;
    } else {
      this.draftKey = '';
      this.draftToken = '';
      this.draftUserKey = '';
      this.draftSound = '';
      this.draftTimeout = null;
    }
    this.pushoverDialogOpen = true;
  }

  savePushover(): void {
    const key = this.draftKey.trim();
    if (!key) return;
    const entry: PushoverEntry = {};
    if (this.draftToken) entry['token'] = this.draftToken;
    if (this.draftUserKey) entry['user_key'] = this.draftUserKey;
    if (this.draftSound) entry['sound'] = this.draftSound;
    if (this.draftTimeout !== null) entry['timeout_seconds'] = this.draftTimeout;
    this.pushovers.set({ ...this.pushovers(), [key]: entry });
    this.dirty.set(true);
    this.pushoverDialogOpen = false;
  }

  confirmRemovePushover(key: string): void {
    this.confirm.confirm({
      header: this.i18n.translate('config.remove_header'),
      message: this.i18n.translate('config.remove_message', { key }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.translate('config.delete'),
      rejectLabel: this.i18n.translate('config.cancel'),
      acceptButtonProps: { severity: 'danger' },
      accept: () => this.removePushover(key),
    });
  }

  private removePushover(key: string): void {
    const next = { ...this.pushovers() };
    delete next[key];
    this.pushovers.set(next);
    if (this.defaultPushover === key) this.defaultPushover = '';
    this.dirty.set(true);
  }

  async save(): Promise<void> {
    if (!this.dirty() || !this.networksValid()) return;
    this.saving.set(true);
    try {
      const updated = await this.service.update({
        default_pushover: this.defaultPushover,
        default_network: this.defaultNetwork,
        pushovers: this.pushovers(),
        networks: this.latestNetworks,
      });
      this.applyConfig(updated);
      this.messages.add({
        severity: 'success',
        summary: this.i18n.translate('config.toast_saved'),
        life: 2500,
      });
    } catch {
      /* errors surfaced by the HTTP interceptor */
    } finally {
      this.saving.set(false);
    }
  }
}
