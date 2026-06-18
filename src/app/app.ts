import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from './core/auth/auth.service';
import { NetworkHealthService } from './core/http/network-health.service';
import { SystemStatusService } from './core/api/system-status.service';
import { TopmenuComponent } from './core/layout/topmenu/topmenu.component';
import { FooterComponent } from './core/layout/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ToastModule,
    ConfirmDialogModule,
    TopmenuComponent,
    FooterComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly auth = inject(AuthService);
  readonly network = inject(NetworkHealthService);
  readonly systemStatus = inject(SystemStatusService);
}
