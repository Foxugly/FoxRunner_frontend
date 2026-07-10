import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { NetworkHealthService } from '../../http/network-health.service';
import { SystemStatusService } from '../../api/system-status.service';
import { TopmenuComponent } from '../topmenu/topmenu.component';
import { FooterComponent } from '../footer/footer.component';

/**
 * Authenticated shell (fleet standard §96): global banners, skip-link,
 * topmenu, `<main>` content outlet and footer, in a flex column that keeps
 * the footer at the bottom. Wraps the guarded routes via its `<router-outlet>`.
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, TranslocoPipe, TopmenuComponent, FooterComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  readonly network = inject(NetworkHealthService);
  readonly systemStatus = inject(SystemStatusService);
}
