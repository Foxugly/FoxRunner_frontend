import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Three-column page header: optional left slot (back button / breadcrumbs),
 * centered <h1> title with an optional [slot=title-after] (status badge), and
 * an optional right slot (actions). Mirrors the fleet standard (QuizOnline /
 * TrainingManager). Actions and back buttons are projected by the caller.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly icon = input<string>();
}
