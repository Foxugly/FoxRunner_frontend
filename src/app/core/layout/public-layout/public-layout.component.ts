import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { TopmenuComponent } from '../topmenu/topmenu.component';
import { FooterComponent } from '../footer/footer.component';

/**
 * Public shell (fleet standard §99): skip-link, topmenu in `public` mode,
 * `<main>` content outlet and footer, in a flex column that keeps the footer
 * at the bottom. No banners, no auth guard — used to wrap the marketing/legal
 * routes (`/features`, `/about`).
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, TranslocoPipe, TopmenuComponent, FooterComponent],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss',
})
export class PublicLayoutComponent {}
