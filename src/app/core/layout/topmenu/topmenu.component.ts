import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../auth/auth.service';
import { ThemeService } from '../../theme/theme.service';
import { LanguageService } from '../../i18n/language.service';
import { LanguageSwitcherComponent } from '../../i18n/language-switcher/language-switcher.component';

interface NavLink {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

@Component({
  selector: 'app-topmenu',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    MenuModule,
    TooltipModule,
    TranslocoPipe,
    LanguageSwitcherComponent,
  ],
  templateUrl: './topmenu.component.html',
  styleUrl: './topmenu.component.scss',
})
export class TopmenuComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly i18n = inject(TranslocoService);
  private readonly lang = inject(LanguageService);
  readonly menuOpen = signal(false);

  readonly links = computed<NavLink[]>(() => {
    const base: NavLink[] = [
      { label: 'chrome.nav.dashboard', icon: 'pi pi-home', link: '/', exact: true },
      { label: 'chrome.nav.scenarios', icon: 'pi pi-sitemap', link: '/scenarios' },
    ];
    if (this.auth.isSuperuser()) {
      base.push({ label: 'chrome.nav.admin', icon: 'pi pi-cog', link: '/admin' });
    }
    return base;
  });

  readonly userMenu = computed<MenuItem[]>(() => {
    this.lang.activeLang();
    return [
      { label: this.i18n.translate('chrome.user.profile'), icon: 'pi pi-user', routerLink: '/profile' },
      {
        label: this.i18n.translate('chrome.user.logout'),
        icon: 'pi pi-sign-out',
        command: () => void this.logout(),
      },
    ];
  });

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
