import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <footer class="footer">
      <div class="footer__inner">
        <span class="footer__brand">FoxRunner</span>
        <span class="footer__tagline">{{ 'chrome.footer.tagline' | transloco }}</span>
        <span class="footer__spacer"></span>
        <span class="footer__meta">
          <span>{{ 'chrome.footer.version' | transloco: { version: version } }}</span>
          <span class="footer__sep" aria-hidden="true">·</span>
          <span>
            © {{ year }}
            <a
              href="https://www.foxugly.com"
              target="_blank"
              rel="noopener noreferrer"
              class="footer__link"
              >Foxugly</a
            >
          </span>
        </span>
      </div>
    </footer>
  `,
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly version = environment.appVersion;
  readonly year = new Date().getFullYear();
}
