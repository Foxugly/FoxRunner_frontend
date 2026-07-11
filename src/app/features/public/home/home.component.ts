import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { LanguageService } from '../../../core/i18n/language.service';
import { HighlightKey, getHomeText } from './home.text';

type Tone = 'emerald' | 'sky' | 'amber' | 'rose';

interface HighlightCard {
  readonly key: HighlightKey;
  readonly icon: string;
  readonly tone: Tone;
}

/**
 * Public landing page (fleet standard): centered hero with a primary emerald
 * "sign in" CTA and an outlined "features" CTA, followed by a grid of tinted
 * highlight cards. All copy lives in `home.text.ts` (5 languages, no i18n JSON).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    <section class="home">
      <header class="home__hero">
        <h1 class="home__title">{{ text().hero.title }}</h1>
        <p class="home__lead">{{ text().hero.lead }}</p>
        <div class="home__cta">
          <p-button
            [routerLink]="['/login']"
            [label]="text().hero.login"
            icon="pi pi-sign-in"
          />
          <p-button
            [routerLink]="['/features']"
            [label]="text().hero.features"
            icon="pi pi-arrow-right"
            iconPos="right"
            [outlined]="true"
          />
        </div>
      </header>

      <section class="home__highlights">
        <h2 class="home__h2">{{ text().highlights.title }}</h2>
        <div class="home-grid">
          @for (card of cards; track card.key) {
            <article class="home-card">
              <span
                class="home-card__icon"
                [class]="'home-card__icon--' + card.tone"
                aria-hidden="true"
              >
                <i class="pi" [class]="card.icon"></i>
              </span>
              <h3 class="home-card__title">{{ text().highlights.cards[card.key].title }}</h3>
              <p class="home-card__desc">{{ text().highlights.cards[card.key].description }}</p>
            </article>
          }
        </div>
      </section>
    </section>
  `,
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly languageService = inject(LanguageService);

  protected readonly text = computed(() => getHomeText(this.languageService.activeLang()));

  protected readonly cards: readonly HighlightCard[] = [
    { key: 'slots', icon: 'pi-calendar', tone: 'emerald' },
    { key: 'supervised', icon: 'pi-bolt', tone: 'amber' },
    { key: 'notifications', icon: 'pi-bell', tone: 'sky' },
    { key: 'i18n', icon: 'pi-globe', tone: 'rose' },
  ];
}
