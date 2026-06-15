import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DataTableComponent } from './data-table.component';
import { CellTemplateDirective } from './cell-template.directive';
import type { DataTableColumn } from './data-table.types';

@Component({
  standalone: true,
  imports: [DataTableComponent, CellTemplateDirective],
  template: `
    <app-data-table [value]="rows" [columns]="cols" emptyTitle="Vide">
      <ng-template appCell="name" let-row>
        <span class="custom">{{ row.name }}!</span>
      </ng-template>
    </app-data-table>
  `,
})
class HostComponent {
  rows = [
    { id: 1, name: 'Alice', role: 'owner' },
    { id: 2, name: 'Bob', role: 'guest' },
  ];
  cols: DataTableColumn[] = [
    { field: 'name', header: 'Nom', sortable: true },
    { field: 'role', header: 'Rôle', searchable: false },
  ];
}

describe('DataTableComponent', () => {
  it('renders one row per value, projecting appCell and falling back to text', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const custom = el.querySelectorAll('.custom');
    expect(custom.length).toBe(2);
    expect(custom[0].textContent).toContain('Alice!');
    expect(el.textContent).toContain('owner');
  });

  it('excludes searchable:false columns from globalFilterFields', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dt = fixture.debugElement.query(By.directive(DataTableComponent))
      .componentInstance as DataTableComponent;
    expect(dt.globalFilterFields).toEqual(['name']);
  });
});
