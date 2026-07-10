import { Component } from '@angular/core';
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
  imports: [TranslocoPipe],
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
              class="footer__link"
              >{{ 'footer.author' | transloco }}</a
            >
          </span>
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
