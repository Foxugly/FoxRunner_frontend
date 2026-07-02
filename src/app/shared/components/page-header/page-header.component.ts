import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    <header class="flex align-items-center justify-content-between mb-4 gap-3">
      <div class="ph-side flex align-items-center">
        @if (backLink) {
          <p-button
            label="Retour"
            icon="pi pi-arrow-left"
            [outlined]="true"
            severity="secondary"
            [routerLink]="backLink"
          />
        }
      </div>

      <div class="flex align-items-center justify-content-center gap-2 text-center flex-1 min-w-0">
        @if (icon) {
          <i [class]="'pi ' + icon" style="font-size: 1.5rem; color: var(--fox-primary)"></i>
        }
        <h1 class="m-0 text-2xl font-semibold">{{ title }}</h1>
      </div>

      <div class="ph-side flex align-items-center justify-content-end gap-2 flex-wrap">
        <ng-content />
      </div>
    </header>
  `,
  styles: [
    `
      .ph-side {
        flex: 1 1 0;
        min-width: 0;
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() icon?: string;
  @Input() backLink?: string | (string | number)[];
}
