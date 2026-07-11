import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { LanguageService } from '../../../core/i18n/language.service';
import { FeatureKey, getFeaturesText } from './features.text';

type Tone = 'emerald' | 'sky' | 'amber' | 'violet' | 'rose' | 'teal';

interface FeatureCard {
  readonly key: FeatureKey;
  readonly icon: string;
  readonly tone: Tone;
}

/**
 * Public features page (fleet standard §168): centered intro, a grid of
 * hover-lift cards (one tinted icon per card) and an emerald CTA to `/login`.
 * Card copy comes from `features.text.ts` (5 languages, no i18n JSON keys).
 */
@Component({
  selector: 'app-features',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesComponent {
  private readonly languageService = inject(LanguageService);

  protected readonly text = computed(() => getFeaturesText(this.languageService.activeLang()));

  protected readonly cards: readonly FeatureCard[] = [
    { key: 'scenarios', icon: 'pi-calendar', tone: 'emerald' },
    { key: 'live', icon: 'pi-bolt', tone: 'amber' },
    { key: 'notifications', icon: 'pi-bell', tone: 'sky' },
    { key: 'catalog', icon: 'pi-sitemap', tone: 'teal' },
    { key: 'admin', icon: 'pi-shield', tone: 'violet' },
    { key: 'i18n', icon: 'pi-globe', tone: 'rose' },
  ];
}
