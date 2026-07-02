import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../auth/auth.service';
import { ThemeService } from '../../theme/theme.service';

interface NavLink {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

@Component({
  selector: 'app-topmenu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ButtonModule, MenuModule, TooltipModule],
  templateUrl: './topmenu.component.html',
  styleUrl: './topmenu.component.scss',
})
export class TopmenuComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly menuOpen = signal(false);

  readonly links = computed<NavLink[]>(() => {
    const base: NavLink[] = [
      { label: 'Tableau de bord', icon: 'pi pi-home', link: '/', exact: true },
      { label: 'Scénarios', icon: 'pi pi-sitemap', link: '/scenarios' },
      { label: 'Exécutions', icon: 'pi pi-play', link: '/executions' },
    ];
    if (this.auth.isSuperuser()) {
      base.push({ label: 'Admin', icon: 'pi pi-cog', link: '/admin' });
    }
    return base;
  });

  readonly userMenu = computed<MenuItem[]>(() => [
    { label: 'Profil', icon: 'pi pi-user', routerLink: '/profile' },
    { label: 'Déconnexion', icon: 'pi pi-sign-out', command: () => void this.logout() },
  ]);

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  async logout(): Promise<void> {
    this.closeMenu();
    await this.auth.logout();
  }
}
