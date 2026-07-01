import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Shared detail-page header (fleet §3.15 pattern, mirrored from TrainingManager's
 * `app-detail-header`): a round outlined "back" button on the left, a centered
 * title block (icon + eyebrow + title, with optional subtitle / badges), and a
 * row of round outlined icon action buttons on the right.
 *
 * Actions are projected via `detailHeaderActions`; use round outlined `p-button`s
 * with a `pTooltip` so the toolbar stays compact. Other slots:
 * `detailHeaderTitleSuffix`, `detailHeaderSubtitle`, `detailHeaderBadges`,
 * `detailHeaderMeta`. Empty slots collapse (`:empty`), so project only what you need.
 */
@Component({
  selector: 'app-detail-header',
  standalone: true,
  imports: [RouterLink, ButtonModule, TooltipModule],
  template: `
    <header class="detail-header">
      <div class="flex align-items-center gap-3 flex-wrap">
        @if (backLink(); as link) {
          <p-button
            [rounded]="true"
            [outlined]="true"
            severity="secondary"
            icon="pi pi-arrow-left"
            [routerLink]="link"
            [pTooltip]="backTooltip()"
            tooltipPosition="bottom"
            [ariaLabel]="backTooltip()"
          />
        }

        <div class="dh-titleblock flex-1 flex flex-column align-items-center text-center gap-1">
          <h1 class="dh-title m-0 flex align-items-baseline justify-content-center flex-wrap gap-2">
            @if (icon(); as i) {
              <i [class]="'pi ' + i + ' dh-icon'" aria-hidden="true"></i>
            }
            @if (eyebrow(); as e) {
              <span class="dh-eyebrow">{{ e }}</span>
            }
            <span>{{ title() }}</span>
            <ng-content select="[detailHeaderTitleSuffix]" />
          </h1>
          <div class="dh-subtitle text-sm">
            <ng-content select="[detailHeaderSubtitle]" />
          </div>
          <div class="dh-badges flex flex-wrap align-items-center justify-content-center gap-2">
            <ng-content select="[detailHeaderBadges]" />
          </div>
        </div>

        <div class="dh-actions flex align-items-center justify-content-end flex-wrap gap-1">
          <ng-content select="[detailHeaderActions]" />
        </div>
      </div>

      <div class="dh-meta mt-3 flex flex-wrap align-items-center justify-content-center gap-3">
        <ng-content select="[detailHeaderMeta]" />
      </div>
    </header>
  `,
  styles: [
    `
      .detail-header {
        margin-bottom: 1.5rem;
      }
      .dh-titleblock {
        min-width: 0;
      }
      .dh-title {
        font-size: 1.5rem;
        font-weight: 600;
        line-height: 1.2;
      }
      .dh-icon {
        font-size: 0.9rem;
        color: var(--fox-primary);
      }
      .dh-eyebrow {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: #059669;
      }
      .dh-subtitle {
        color: var(--text-color-secondary, #6b7280);
        max-width: 42rem;
      }
      /* Collapse unused projection slots (Angular strips whitespace, so an
         unfilled slot leaves the wrapper genuinely :empty). */
      .dh-subtitle:empty,
      .dh-badges:empty,
      .dh-actions:empty,
      .dh-meta:empty {
        display: none;
      }
    `,
  ],
})
export class DetailHeaderComponent {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly backLink = input<(string | number)[] | string | null>(null);
  readonly backTooltip = input<string>('Retour');
  readonly icon = input<string | null>(null);
}
