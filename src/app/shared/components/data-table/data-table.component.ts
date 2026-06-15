import {
  Component,
  ContentChildren,
  Input,
  QueryList,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { CellTemplateDirective } from './cell-template.directive';
import type { DataTableColumn } from './data-table.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    EmptyStateComponent,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  @Input({ required: true }) value: unknown[] = [];
  @Input({ required: true }) columns: DataTableColumn[] = [];
  @Input() dataKey?: string;
  @Input() loading = false;
  @Input() pageSize = 25;
  @Input() rowsPerPageOptions: number[] = [10, 25, 50];
  @Input() searchPlaceholder = 'Rechercher…';
  @Input() emptyIcon?: string;
  @Input({ required: true }) emptyTitle = '';
  @Input() emptyMessage?: string;

  @ContentChildren(CellTemplateDirective)
  private cellTemplates?: QueryList<CellTemplateDirective>;

  get globalFilterFields(): string[] {
    return this.columns.filter((c) => c.searchable !== false).map((c) => c.field);
  }

  cellTemplate(field: string): TemplateRef<unknown> | null {
    const match = this.cellTemplates?.find((t) => t.field === field);
    return match ? match.templateRef : null;
  }
}
