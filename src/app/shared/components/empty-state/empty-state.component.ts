import { Component, Input } from '@angular/core';

type EmptyTone = 'emerald' | 'rose' | 'gray';

/**
 * Shared empty-state (fleet OPERATIONS.md §3.15): an icon in a soft tone pill +
 * title + optional subtitle, with a projected call-to-action. Use for genuinely
 * empty collections, not for loading.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-column align-items-center justify-content-center py-8 px-4 text-center">
      <span class="empty-pill" [class]="'empty-pill--' + tone">
        <i [class]="'pi ' + (icon ?? 'pi-inbox')"></i>
      </span>
      <h3 class="mt-3 mb-1 text-lg font-medium">{{ title }}</h3>
      @if (subtitle ?? message; as sub) {
        <p class="text-color-secondary m-0 mb-3">{{ sub }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: [
    `
      .empty-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 4rem;
        height: 4rem;
        border-radius: 9999px;
      }
      .empty-pill i {
        font-size: 1.75rem;
      }
      .empty-pill--emerald {
        background: rgba(16, 185, 129, 0.12);
        color: #059669;
      }
      .empty-pill--rose {
        background: rgba(244, 63, 94, 0.12);
        color: #e11d48;
      }
      .empty-pill--gray {
        background: rgba(107, 114, 128, 0.12);
        color: #6b7280;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input({ required: true }) title = '';
  /** Preferred secondary line; `message` kept as a back-compat alias. */
  @Input() subtitle?: string;
  @Input() message?: string;
  @Input() icon?: string;
  @Input() tone: EmptyTone = 'emerald';
}
