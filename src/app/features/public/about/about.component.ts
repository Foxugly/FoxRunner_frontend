import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { LanguageService } from '../../../core/i18n/language.service';
import { AboutTab, getAboutPageUiText } from './about.text';

// ── Coordonnées Foxugly (identité flotte, reprise de TrainingManager) ────────
const EMAIL_USER = 'info';
const EMAIL_HOST = 'foxugly';
const EMAIL_TLD = 'com';
const PHONE_DISPLAY = '+32 478 811988';
const WEBSITE_URL = 'https://www.foxugly.com';
const WEBSITE_DISPLAY = 'www.foxugly.com';
const REPO_URL = 'https://github.com/Foxugly';

/**
 * Public about page (fleet standard §184): intro with a GitHub link, then a
 * `p-tabs` split into Company / Legal / Technical. Company & Legal reuse the
 * Foxugly identity/GDPR text verbatim; Technical is FoxRunner-specific. All
 * copy lives in `about.text.ts` (5 languages, no i18n JSON keys).
 */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [Tabs, TabList, Tab, TabPanels, TabPanel],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  private readonly languageService = inject(LanguageService);

  protected readonly repoUrl = REPO_URL;
  protected readonly websiteUrl = WEBSITE_URL;
  protected readonly websiteDisplay = WEBSITE_DISPLAY;
  protected readonly phoneDisplay = PHONE_DISPLAY;

  protected readonly activeTab = signal<AboutTab>('company');
  protected readonly copied = signal(false);
  protected readonly ui = computed(() => getAboutPageUiText(this.languageService.activeLang()));

  /** Obfuscated address shown on screen (real value copied on demand). */
  protected readonly emailDisplay = `${EMAIL_USER} [at] ${EMAIL_HOST} [dot] ${EMAIL_TLD}`;

  protected async copyEmail(): Promise<void> {
    const address = `${EMAIL_USER}@${EMAIL_HOST}.${EMAIL_TLD}`;
    try {
      await navigator.clipboard.writeText(address);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context / denied) — non-fatal.
    }
  }
}
