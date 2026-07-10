import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ArtifactsService } from '../../../core/api/artifacts.service';
import type { Artifact } from '../../../core/api/types';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

interface KindOption {
  label: string;
  value: 'screenshots' | 'pages' | null;
}

@Component({
  selector: 'app-admin-artifacts',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslocoPipe,
    TableModule,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    TagModule,
    TooltipModule,
    EmptyStateComponent,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header icon="pi-image" [title]="'admin.artifacts.title' | transloco">
      <p-button
        slot="left"
        icon="pi pi-arrow-left"
        [label]="'admin.common.back' | transloco"
        [outlined]="true"
        severity="secondary"
        routerLink="/admin"
      />
      <p-button
        slot="right"
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
      />
    </app-page-header>

    <div class="flex gap-3 mb-3 flex-wrap align-items-end">
      <div class="flex flex-column gap-1">
        <label for="kind" class="text-sm text-color-secondary">{{ 'admin.artifacts.filter_kind' | transloco }}</label>
        <p-select
          inputId="kind"
          [options]="kindOptions"
          [(ngModel)]="filterKind"
          optionLabel="label"
          optionValue="value"
          [style]="{ width: '14rem' }"
          (onChange)="reload()"
        />
      </div>
      <div class="flex flex-column gap-1">
        <label for="prune" class="text-sm text-color-secondary">{{ 'admin.artifacts.filter_prune' | transloco }}</label>
        <p-inputnumber
          inputId="prune"
          [(ngModel)]="pruneDays"
          [min]="1"
          [max]="3650"
          [suffix]="'admin.common.day_suffix' | transloco"
        />
      </div>
      <p-button
        [label]="'admin.artifacts.prune_button' | transloco"
        icon="pi pi-trash"
        severity="danger"
        [loading]="pruning()"
        (onClick)="prune()"
      />
    </div>

    <p-table
      [value]="items()"
      [lazy]="true"
      [paginator]="true"
      [rows]="rows()"
      [first]="first()"
      [totalRecords]="total()"
      [loading]="loading()"
      (onLazyLoad)="onLazyLoad($event)"
      [rowsPerPageOptions]="[20, 50, 100]"
      dataKey="name"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th style="width: 7rem">{{ 'admin.artifacts.col_kind' | transloco }}</th>
          <th>{{ 'admin.artifacts.col_name' | transloco }}</th>
          <th style="width: 8rem">{{ 'admin.artifacts.col_size' | transloco }}</th>
          <th style="width: 14rem">{{ 'admin.artifacts.col_modified' | transloco }}</th>
          <th style="width: 8rem">{{ 'admin.artifacts.col_actions' | transloco }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-a>
        <tr>
          <td><p-tag [value]="a.kind" severity="secondary" /></td>
          <td><code class="text-xs">{{ a.name }}</code></td>
          <td>{{ formatSize(a.size) }}</td>
          <td>{{ formatDate(a.updated_at) }}</td>
          <td>
            <p-button
              icon="pi pi-download"
              severity="secondary"
              [text]="true"
              [rounded]="true"
              size="small"
              [loading]="downloading() === a.name"
              [pTooltip]="'admin.artifacts.tooltip_download' | transloco"
              (onClick)="download(a)"
            />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="5">
            <app-empty-state icon="pi-image" [title]="'admin.artifacts.empty_title' | transloco" />
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class AdminArtifactsComponent implements OnInit {
  private readonly service = inject(ArtifactsService);
  private readonly messages = inject(MessageService);
  private readonly i18n = inject(TranslocoService);

  readonly kindOptions: KindOption[] = [
    { label: this.i18n.translate('admin.artifacts.kind_all'), value: null },
    { label: this.i18n.translate('admin.artifacts.kind_screenshots'), value: 'screenshots' },
    { label: this.i18n.translate('admin.artifacts.kind_pages'), value: 'pages' },
  ];
  readonly items = signal<Artifact[]>([]);
  readonly total = signal(0);
  readonly rows = signal(50);
  readonly first = signal(0);
  readonly loading = signal(false);
  readonly pruning = signal(false);
  readonly downloading = signal<string | null>(null);

  filterKind: 'screenshots' | 'pages' | null = null;
  pruneDays = 30;

  ngOnInit(): void {
    void this.load(0, this.rows());
  }

  onLazyLoad(ev: TableLazyLoadEvent): void {
    const first = ev.first ?? 0;
    const rows = ev.rows ?? this.rows();
    this.first.set(first);
    this.rows.set(rows);
    void this.load(first, rows);
  }

  reload(): void {
    this.first.set(0);
    void this.load(0, this.rows());
  }

  async download(a: Artifact): Promise<void> {
    this.downloading.set(a.name);
    try {
      const url = await this.service.downloadBlob(a.kind, a.name);
      const link = document.createElement('a');
      link.href = url;
      link.download = a.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      /* interceptor toasts */
    } finally {
      this.downloading.set(null);
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  formatDate(ts?: number | null): string {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    return d.toLocaleString('fr-BE');
  }

  private async load(offset: number, limit: number): Promise<void> {
    this.loading.set(true);
    try {
      const page = await this.service.list({
        kind: this.filterKind ?? undefined,
        limit,
        offset,
      });
      this.items.set(page.items);
      this.total.set(page.total);
    } catch {
      /* toast */
    } finally {
      this.loading.set(false);
    }
  }

  async prune(): Promise<void> {
    this.pruning.set(true);
    try {
      await this.service.prune(this.pruneDays);
      this.messages.add({
        severity: 'success',
        summary: this.i18n.translate('admin.artifacts.toast_pruned'),
        detail: this.i18n.translate('admin.artifacts.toast_pruned_detail', { days: this.pruneDays }),
        life: 3000,
      });
      this.reload();
    } catch {
      /* toast */
    } finally {
      this.pruning.set(false);
    }
  }
}
