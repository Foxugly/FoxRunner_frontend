import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="flex align-items-start justify-content-between mb-4 gap-3 flex-wrap">
      <div class="flex align-items-center gap-3">
        @if (icon) {
          <i [class]="'pi ' + icon" style="font-size: 1.75rem; color: var(--fox-primary)"></i>
        }
        <h1 class="m-0 text-2xl font-semibold">{{ title }}</h1>
      </div>
      <div class="flex gap-2 flex-wrap">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() icon?: string;
}
