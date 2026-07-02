import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
    <app-page-header icon="pi-server" title="Configuration" />

    @if (loading()) {
      <p-card>
        <p-skeleton height="2rem" styleClass="mb-2" />
        <p-skeleton height="2rem" width="60%" />
      </p-card>
    } @else {
      <p-card header="Valeurs par défaut">
        <div class="meta-grid cols-2">
          <div class="meta-item">
            <label class="meta-label" for="def-pushover">Pushover par défaut</label>
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
            <label class="meta-label" for="def-network">Réseau par défaut</label>
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

      <p-card styleClass="mt-3">
        <ng-template pTemplate="header">
          <div class="flex align-items-center justify-content-between p-3 pb-0">
            <span class="font-semibold"><i class="pi pi-bell mr-2"></i>Pushovers</span>
            <p-button
              label="Ajouter"
              icon="pi pi-plus"
              severity="success"
              size="small"
              (onClick)="openPushover(null)"
            />
          </div>
        </ng-template>
        @if (pushoverKeys().length === 0) {
          <p class="text-color-secondary text-sm m-0">Aucun pushover configuré.</p>
        } @else {
          <div class="flex flex-column gap-2">
            @for (key of pushoverKeys(); track key) {
              <div
                class="flex align-items-center justify-content-between gap-2 p-2 border-1 surface-border border-round"
              >
                <div class="min-w-0">
                  <div class="font-medium">{{ key }}</div>
                  <div class="text-xs text-color-secondary">
                    <i class="pi pi-lock mr-1"></i>token &amp; clé masqués · son
                    {{ pushovers()[key]['sound'] || '—' }} · timeout
                    {{ pushovers()[key]['timeout_seconds'] ?? '—' }} s
                  </div>
                </div>
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    [rounded]="true"
                    severity="secondary"
                    ariaLabel="Éditer le pushover"
                    (onClick)="openPushover(key)"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    [rounded]="true"
                    severity="danger"
                    ariaLabel="Supprimer le pushover"
                    (onClick)="confirmRemovePushover(key)"
                  />
                </div>
              </div>
            }
          </div>
        }
      </p-card>

      <p-card styleClass="mt-3" header="Réseaux (JSON)">
        <p class="text-color-secondary text-sm mb-2">
          Bloc « networks » complet (profils de détection réseau). Édition JSON directe.
        </p>
        <app-json-editor
          label="Networks"
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
      [header]="editingKey() ? 'Éditer le pushover' : 'Nouveau pushover'"
      [style]="{ width: '480px' }"
    >
      <div class="meta-grid">
        <div class="meta-item">
          <label class="meta-label" for="pk">Nom (clé)</label>
          <div class="meta-value">
            <input
              id="pk"
              pInputText
              [(ngModel)]="draftKey"
              [disabled]="editingKey() !== null"
              placeholder="ex. main"
            />
          </div>
        </div>
        <div class="meta-item">
          <label class="meta-label" for="ptok">Token</label>
          <div class="meta-value">
            <input id="ptok" pInputText [(ngModel)]="draftToken" placeholder="token Pushover" />
          </div>
        </div>
        <div class="meta-item">
          <label class="meta-label" for="pusr">Clé utilisateur</label>
          <div class="meta-value">
            <input id="pusr" pInputText [(ngModel)]="draftUserKey" placeholder="user key" />
          </div>
        </div>
        <div class="meta-item">
          <label class="meta-label" for="psnd">Son</label>
          <div class="meta-value">
            <input id="psnd" pInputText [(ngModel)]="draftSound" placeholder="ex. vibrate" />
          </div>
        </div>
        <div class="meta-item">
          <label class="meta-label" for="pto">Timeout (s)</label>
          <div class="meta-value">
            <p-inputnumber inputId="pto" [(ngModel)]="draftTimeout" [min]="0" />
          </div>
        </div>
        <p class="meta-hint meta-item--full">
          Laisse le token / la clé sur « •••••••• » pour conserver la valeur enregistrée.
        </p>
      </div>
      <ng-template pTemplate="footer">
        <app-form-footer
          saveLabel="Valider"
          [disabled]="!draftKey.trim()"
          (save)="savePushover()"
          (cancelled)="pushoverDialogOpen = false"
        />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class ConfigComponent implements OnInit, HasUnsavedChanges {
  private readonly service = inject(CatalogConfigService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

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
      header: 'Supprimer le pushover ?',
      message: `« ${key} » sera retiré de la configuration à l'enregistrement.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
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
        summary: 'Configuration enregistrée',
        life: 2500,
      });
    } catch {
      /* errors surfaced by the HTTP interceptor */
    } finally {
      this.saving.set(false);
    }
  }
}
