import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div
      class="flex flex-column align-items-center justify-content-center py-8 px-4 text-center"
    >
      <i
        [class]="'pi ' + (icon ?? 'pi-inbox')"
        style="font-size: 3rem; color: var(--p-text-muted-color, #6b7280)"
      ></i>
      <h3 class="mt-3 mb-1 text-lg font-medium">{{ title }}</h3>
      @if (message) {
        <p class="text-color-secondary m-0 mb-3">{{ message }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  @Input({ required: true }) title = '';
  @Input() message?: string;
  @Input() icon?: string;
}
