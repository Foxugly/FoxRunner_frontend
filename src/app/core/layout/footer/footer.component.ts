import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { environment } from '../../../../environments/environment';

/** Runtime version injected via SSM (window.__FOXRUNNER_VERSION), else build-time. */
function resolveVersion(): string {
  const injected =
    typeof window !== 'undefined'
      ? (window as unknown as { __FOXRUNNER_VERSION?: string }).__FOXRUNNER_VERSION
      : undefined;
  return injected || environment.appVersion;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  template: `
    <footer class="footer">
      <div class="footer__inner">
        <span class="footer__brand">{{ 'app.title' | transloco }}</span>
        <span class="footer__tagline">{{ 'app.tagline' | transloco }}</span>
        <span class="footer__spacer"></span>
        <span class="footer__meta">
          <span>{{ 'footer.version_label' | transloco: { version: version } }}</span>
          <span class="footer__sep" aria-hidden="true">·</span>
          <span>
            © {{ year }}
            <a
              href="https://www.foxugly.com"
              target="_blank"
              rel="noopener noreferrer"
              class="footer__link footer__brand-link"
            >
              <img
                src="/foxugly-logo.svg"
                [alt]="'footer.author' | transloco"
                class="footer__logo"
              />
              <span class="footer__brand-name">{{ 'footer.author' | transloco }}</span>
            </a>
          </span>
          <span class="footer__sep" aria-hidden="true">·</span>
          <a routerLink="/about" class="footer__privacy">{{ 'footer.privacy' | transloco }}</a>
          <span class="footer__sep" aria-hidden="true">·</span>
          <span>{{ 'footer.rights' | transloco }}</span>
        </span>
      </div>
    </footer>
  `,
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly version = resolveVersion();
  readonly year = new Date().getFullYear();
}
