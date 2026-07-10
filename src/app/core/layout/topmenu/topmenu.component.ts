import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
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
}

@Component({
  selector: 'app-topmenu',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    ButtonModule,
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

  /** Fleet-standard chrome mode; the nav only renders when authenticated. */
  readonly mode = input<'public' | 'authenticated'>('authenticated');

  readonly links = computed<NavLink[]>(() => {
    if (this.mode() !== 'authenticated') return [];
    const base: NavLink[] = [
      { label: 'chrome.nav.dashboard', icon: 'pi pi-home', link: '/', exact: true },
      { label: 'chrome.nav.scenarios', icon: 'pi pi-sitemap', link: '/scenarios' },
    ];
    if (this.auth.isSuperuser()) {
      base.push({ label: 'chrome.nav.admin', icon: 'pi pi-cog', link: '/admin' });
    }
    return base;
  });

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
