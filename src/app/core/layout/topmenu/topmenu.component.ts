import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../auth/auth.service';
import { ThemeService } from '../../theme/theme.service';
import { LanguageSwitcherComponent } from '../../i18n/language-switcher/language-switcher.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

interface NavLink {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
  /** Emerald-highlighted support CTA. */
  support?: boolean;
}

@Component({
  selector: 'app-topmenu',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    TooltipModule,
    TranslocoPipe,
    LanguageSwitcherComponent,
    UserMenuComponent,
  ],
  templateUrl: './topmenu.component.html',
  styleUrl: './topmenu.component.scss',
})
export class TopmenuComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly menuOpen = signal(false);

  /** Fleet-standard chrome mode; drives which nav (public vs app) is shown. */
  readonly mode = input<'public' | 'authenticated'>('authenticated');

  /** Brand target: the public home for guests, the dashboard for the app. */
  readonly brandLink = computed(() => (this.mode() === 'public' ? '/home' : '/'));

  readonly links = computed<NavLink[]>(() => {
    if (this.mode() === 'public') {
      return [
        { label: 'chrome.nav.home', icon: 'pi pi-home', link: '/home', exact: true },
        { label: 'chrome.nav.features', icon: 'pi pi-sparkles', link: '/features' },
        { label: 'chrome.nav.soutenir', icon: 'pi pi-heart', link: '/soutenir' },
        { label: 'chrome.nav.about', icon: 'pi pi-info-circle', link: '/about' },
      ];
    }
    const base: NavLink[] = [
      { label: 'chrome.nav.dashboard', icon: 'pi pi-home', link: '/', exact: true },
      { label: 'chrome.nav.scenarios', icon: 'pi pi-sitemap', link: '/scenarios' },
    ];
    if (this.auth.isSuperuser()) {
      base.push({ label: 'chrome.nav.admin', icon: 'pi pi-cog', link: '/admin' });
    }
    base.push({ label: 'chrome.nav.soutenir', icon: 'pi pi-heart', link: '/soutenir', support: true });
    return base;
  });

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
