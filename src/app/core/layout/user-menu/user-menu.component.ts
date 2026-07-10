import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../auth/auth.service';
import { LanguageService } from '../../i18n/language.service';

/**
 * Polymorphic user slot — the last of the topmenu actions (fleet standard §6).
 * Logged out → a "Sign in" button routing to /login.
 * Logged in  → a dropdown (Profile / … / Logout).
 * The topmenu never branches on `auth` itself: this component does.
 */
@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [RouterLink, ButtonModule, MenuModule, TranslocoPipe],
  template: `
    @if (auth.isLoggedIn()) {
      <p-menu #userMenuPopup [model]="menu()" [popup]="true" appendTo="body" />
      <p-button
        icon="pi pi-user"
        [label]="auth.currentUser()?.email ?? ''"
        severity="secondary"
        [text]="true"
        (onClick)="userMenuPopup.toggle($event)"
        [ariaLabel]="'chrome.user.menu_aria' | transloco"
        aria-haspopup="true"
        class="user-menu__trigger"
      />
    } @else {
      <p-button
        icon="pi pi-sign-in"
        [label]="'chrome.user.sign_in' | transloco"
        severity="secondary"
        [text]="true"
        routerLink="/login"
      />
    }
  `,
  styleUrl: './user-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenuComponent {
  readonly auth = inject(AuthService);
  private readonly i18n = inject(TranslocoService);
  private readonly lang = inject(LanguageService);

  readonly menu = computed<MenuItem[]>(() => {
    this.lang.activeLang(); // re-translate on live language change
    return [
      { label: this.i18n.translate('chrome.user.profile'), icon: 'pi pi-user', routerLink: '/profile' },
      {
        label: this.i18n.translate('chrome.user.logout'),
        icon: 'pi pi-sign-out',
        command: () => void this.auth.logout(),
      },
    ];
  });
}
