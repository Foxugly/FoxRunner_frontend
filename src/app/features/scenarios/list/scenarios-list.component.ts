import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ConfirmationService, MessageService, type MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { Menu, MenuModule } from 'primeng/menu';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import type { ScenarioSummary, ScenarioCreate } from '../../../core/api/types';
import { newIdempotencyKey } from '../../../core/utils/idempotency';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-scenarios-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    TagModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    ConfirmDialogModule,
    SkeletonModule,
    MenuModule,
    PageHeaderComponent,
    EmptyStateComponent,
    TranslocoPipe,
  ],
  template: `
    <app-page-header
      icon="pi-sitemap"
      [title]="'scenarios.list.title' | transloco"
    >
      <p-button
        slot="right"
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
        [pTooltip]="'scenarios.common.refresh' | transloco"
      />
      <p-button
        slot="right"
        [label]="'scenarios.list.import' | transloco"
        icon="pi pi-upload"
        severity="secondary"
        (onClick)="openImport()"
      />
      <p-button
        slot="right"
        [label]="'scenarios.list.new' | transloco"
        icon="pi pi-plus"
        severity="success"
        routerLink="/scenarios/new"
      />
    </app-page-header>

    @if (loading()) {
      <div class="scn-grid">
        @for (i of skeletons; track i) {
          <div>
            <div class="scn-card scn-card--static">
              <div class="scn-card__row">
                <p-skeleton shape="circle" size="2.5rem" />
                <div class="scn-skel-lines">
                  <p-skeleton width="60%" height="1.1rem" />
                  <p-skeleton width="40%" height="0.75rem" />
                </div>
              </div>
              <div class="scn-card__footer">
                <p-skeleton width="6rem" height="1.5rem" borderRadius="16px" />
              </div>
            </div>
          </div>
        }
      </div>
    } @else if (items().length === 0) {
      <app-empty-state
        icon="pi-sitemap"
        [title]="'scenarios.list.empty_title' | transloco"
        [subtitle]="'scenarios.list.empty_subtitle' | transloco"
        [tone]="'emerald'"
      >
        <p-button
          [label]="'scenarios.list.create' | transloco"
          icon="pi pi-plus"
          severity="success"
          routerLink="/scenarios/new"
        />
      </app-empty-state>
    } @else {
      <div class="scn-grid">
        @for (s of items(); track s.scenario_id) {
          <div>
            <div
              class="scn-card"
              role="button"
              tabindex="0"
              (click)="openScenario(s)"
              (keydown.enter)="onCardKey($event, s)"
            >
              <div class="scn-card__row">
                <span class="scn-card__icon">
                  <i class="pi pi-sitemap"></i>
                </span>
                <div class="scn-card__meta">
                  <h3 class="scn-card__title">{{ s.scenario_id }}</h3>
                  <p class="scn-card__subtitle">
                    {{ s.role === 'owner' ? ('scenarios.list.card_owner' | transloco) : ('scenarios.list.card_shared' | transloco) }}
                  </p>
                </div>
                <p-button
                  icon="pi pi-ellipsis-v"
                  severity="secondary"
                  [text]="true"
                  [rounded]="true"
                  [ariaLabel]="'scenarios.list.card_actions_aria' | transloco"
                  (onClick)="onCardMenu($event, s, cardMenu)"
                />
              </div>
              <div class="scn-card__footer">
                @if (s.role === 'owner') {
                  <p-tag severity="success" [value]="'scenarios.tag.owner' | transloco" />
                } @else {
                  <p-tag severity="secondary" [value]="'scenarios.tag.shared' | transloco" />
                }
                <i class="pi pi-arrow-right scn-card__arrow"></i>
              </div>
            </div>
          </div>
        }
      </div>
    }

    <p-menu #cardMenu [popup]="true" [model]="cardMenuItems" appendTo="body">
      <ng-template #item let-menuItem>
        <div class="scn-menuitem" [class.scn-menuitem--danger]="menuItem.styleClass === 'danger'">
          <i [class]="menuItem.icon"></i>
          <span>{{ menuItem.label }}</span>
        </div>
      </ng-template>
    </p-menu>

    <p-dialog
      [header]="'scenarios.duplicate.header' | transloco"
      [modal]="true"
      [(visible)]="duplicateOpen"
      [style]="{ width: '420px' }"
    >
      <div class="dlg-stack">
        <label for="newId">{{ 'scenarios.duplicate.new_id_label' | transloco }}</label>
        <input
          id="newId"
          pInputText
          [(ngModel)]="duplicateNewId"
          [placeholder]="'scenarios.duplicate.new_id_placeholder' | transloco"
        />
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="'scenarios.common.cancel' | transloco" severity="secondary" [text]="true" (onClick)="closeDuplicate()" />
        <p-button
          [label]="'scenarios.duplicate.confirm' | transloco"
          icon="pi pi-copy"
          [loading]="duplicating()"
          [disabled]="!duplicateNewId || duplicating()"
          (onClick)="runDuplicate()"
        />
      </ng-template>
    </p-dialog>

    <p-dialog
      [header]="'scenarios.import.header' | transloco"
      [modal]="true"
      [(visible)]="importOpen"
      [style]="{ width: '40rem' }"
    >
      <div class="dlg-stack">
        <div class="dlg-field">
          <label for="importId">{{ 'scenarios.import.id_label' | transloco }}</label>
          <input id="importId" pInputText [(ngModel)]="importId" [placeholder]="'scenarios.import.id_placeholder' | transloco" />
          <small class="dlg-hint">{{ 'scenarios.import.id_hint' | transloco }}</small>
        </div>
        <div class="dlg-field">
          <label for="importFile">{{ 'scenarios.import.file_label' | transloco }}</label>
          <input id="importFile" type="file" accept="application/json,.json" (change)="onImportFile($event)" />
        </div>
        <div class="dlg-field">
          <label for="importText">{{ 'scenarios.import.text_label' | transloco }}</label>
          <textarea id="importText" pInputText [(ngModel)]="importText" rows="10" class="dlg-mono"
            placeholder='{ "scenario_id": "...", "description": "...", "definition": { "steps": [] } }'></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="'scenarios.common.cancel' | transloco" severity="secondary" [text]="true" (onClick)="importOpen = false" />
        <p-button [label]="'scenarios.import.confirm' | transloco" icon="pi pi-upload" [loading]="importing()" [disabled]="!importText.trim() || importing()" (onClick)="runImport()" />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
  `,
  styleUrl: './scenarios-list.component.scss',
})
export class ScenariosListComponent implements OnInit {
  private readonly service = inject(ScenariosService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  importOpen = false;
  importText = '';
  importId = '';
  readonly importing = signal(false);

  readonly items = signal<ScenarioSummary[]>([]);
  readonly loading = signal(false);

  /** Placeholder cards rendered while the list loads. */
  readonly skeletons = [0, 1, 2, 3, 4, 5];

  /** Per-card "⋯" popup menu items, rebuilt for the clicked scenario. */
  cardMenuItems: MenuItem[] = [];

  duplicateOpen = false;
  duplicating = signal(false);
  duplicateNewId = '';
  private duplicateSource: ScenarioSummary | null = null;

  ngOnInit(): void {
    void this.load();
  }

  reload(): void {
    void this.load();
  }

  /** Navigate into a scenario (whole-card click / Enter). */
  openScenario(s: ScenarioSummary): void {
    this.router.navigate(['/scenarios', s.scenario_id]);
  }

  /** Keyboard: only the card itself (not a child button) opens the scenario. */
  onCardKey(event: Event, s: ScenarioSummary): void {
    if (event.target === event.currentTarget) this.openScenario(s);
  }

  /** Open the "⋯" popup for one card without triggering the card navigation. */
  onCardMenu(event: MouseEvent, s: ScenarioSummary, menu: Menu): void {
    event.stopPropagation();
    this.cardMenuItems = [
      { label: this.transloco.translate('scenarios.list.duplicate'), icon: 'pi pi-copy', command: () => this.askDuplicate(s) },
      { label: this.transloco.translate('scenarios.common.delete'), icon: 'pi pi-trash', styleClass: 'danger', command: () => this.askDelete(s) },
    ];
    menu.toggle(event);
  }

  private async load(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.loading.set(true);
    try {
      // Bounded table: load all rows for client-side search/sort (500 is a guard rail).
      const page = await this.service.list(me.id, 500, 0);
      this.items.set(page.items);
      if (page.total > 500) {
        console.warn(`scenarios: ${page.total} rows exceed the 500 client cap; showing first 500.`);
      }
    } catch {
      /* interceptor toasts */
    } finally {
      this.loading.set(false);
    }
  }

  askDuplicate(s: ScenarioSummary): void {
    this.duplicateSource = s;
    this.duplicateNewId = `${s.scenario_id}_copy`;
    this.duplicateOpen = true;
  }

  closeDuplicate(): void {
    this.duplicateOpen = false;
    this.duplicateSource = null;
    this.duplicateNewId = '';
  }

  async runDuplicate(): Promise<void> {
    if (!this.duplicateSource || !this.duplicateNewId) return;
    this.duplicating.set(true);
    try {
      const dup = await this.service.duplicate(
        this.duplicateSource.scenario_id,
        this.duplicateNewId,
      );
      this.messages.add({
        severity: 'success',
        summary: this.transloco.translate('scenarios.toast.duplicated'),
        detail: dup.scenario_id,
        life: 3000,
      });
      this.closeDuplicate();
      this.reload();
    } catch {
      /* toast */
    } finally {
      this.duplicating.set(false);
    }
  }

  askDelete(s: ScenarioSummary): void {
    this.confirm.confirm({
      header: this.transloco.translate('scenarios.confirm.delete_header', { id: s.scenario_id }),
      message: this.transloco.translate('scenarios.confirm.delete_message'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.transloco.translate('scenarios.common.delete'),
      rejectLabel: this.transloco.translate('scenarios.common.cancel'),
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        try {
          await this.service.remove(s.scenario_id);
          this.messages.add({
            severity: 'success',
            summary: this.transloco.translate('scenarios.toast.deleted'),
            detail: s.scenario_id,
            life: 3000,
          });
          this.reload();
        } catch {
          /* toast */
        }
      },
    });
  }

  openImport(): void {
    this.importText = '';
    this.importId = '';
    this.importOpen = true;
  }

  onImportFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.importText = String(reader.result ?? '');
      this.prefillImportId();
    };
    reader.readAsText(file);
  }

  private prefillImportId(): void {
    if (this.importId.trim()) return;
    try {
      const obj = JSON.parse(this.importText) as { scenario_id?: string };
      if (obj.scenario_id) this.importId = obj.scenario_id;
    } catch {
      /* ignored — validated on import */
    }
  }

  async runImport(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me || !this.importText.trim()) return;
    let parsed: Record<string, unknown>;
    try {
      const raw = JSON.parse(this.importText) as unknown;
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        this.messages.add({ severity: 'error', summary: this.transloco.translate('scenarios.import.invalid_summary'), detail: this.transloco.translate('scenarios.import.invalid_not_object'), life: 4000 });
        return;
      }
      parsed = raw as Record<string, unknown>;
    } catch {
      this.messages.add({ severity: 'error', summary: this.transloco.translate('scenarios.import.invalid_summary'), detail: this.transloco.translate('scenarios.import.invalid_unreadable'), life: 4000 });
      return;
    }
    // Tolerate either { scenario_id, description, definition } or a raw definition.
    const definition = (parsed['definition'] ?? parsed) as Record<string, unknown>;
    if (typeof definition !== 'object' || definition === null || Array.isArray(definition)) {
      this.messages.add({ severity: 'error', summary: this.transloco.translate('scenarios.import.invalid_summary'), detail: this.transloco.translate('scenarios.import.invalid_definition'), life: 4000 });
      return;
    }
    const scenarioId = (this.importId || (parsed['scenario_id'] as string) || '').trim();
    if (!scenarioId) {
      this.messages.add({ severity: 'error', summary: this.transloco.translate('scenarios.import.id_required_summary'), detail: this.transloco.translate('scenarios.import.id_required_detail'), life: 4000 });
      return;
    }
    const dto: ScenarioCreate = {
      scenario_id: scenarioId,
      owner_user_id: me.id,
      description: (parsed['description'] as string) ?? '',
      definition,
    };
    this.importing.set(true);
    try {
      await this.service.create(dto, newIdempotencyKey());
      this.messages.add({ severity: 'success', summary: this.transloco.translate('scenarios.toast.imported'), detail: scenarioId, life: 3000 });
      this.importOpen = false;
      this.router.navigate(['/scenarios', scenarioId]);
    } catch {
      /* interceptor toasts (e.g. 409 if the id already exists) */
    } finally {
      this.importing.set(false);
    }
  }
}
