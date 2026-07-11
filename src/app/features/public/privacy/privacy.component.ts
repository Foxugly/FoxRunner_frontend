import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { getAboutPageUiText } from '../about/about.text';

/**
 * Public privacy / GDPR page (/privacy). Reuses the exact same legal content as
 * the About "Mentions légales" tab (single source of truth, already translated
 * in 5 languages) so the two never drift.
 */
@Component({
  selector: 'app-privacy',
  standalone: true,
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {
  private readonly languageService = inject(LanguageService);
  protected readonly legal = computed(
    () => getAboutPageUiText(this.languageService.activeLang()).legal,
  );
}
