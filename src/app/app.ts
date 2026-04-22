import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenubarModule } from 'primeng/menubar';
import { ToastModule } from 'primeng/toast';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    MenubarModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);

  readonly topMenu = computed<MenuItem[]>(() => {
    const base: MenuItem[] = [
      { label: 'Tableau de bord', icon: 'pi pi-home', routerLink: '/' },
      { label: 'Scénarios', icon: 'pi pi-sitemap', routerLink: '/scenarios' },
      { label: 'Slots', icon: 'pi pi-calendar', routerLink: '/slots' },
      { label: 'Jobs', icon: 'pi pi-play', routerLink: '/jobs' },
      { label: 'Plan', icon: 'pi pi-clock', routerLink: '/plan' },
      { label: 'Historique', icon: 'pi pi-history', routerLink: '/history' },
    ];
    if (this.auth.isSuperuser()) {
      base.push({ label: 'Admin', icon: 'pi pi-cog', routerLink: '/admin' });
    }
    return base;
  });

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
