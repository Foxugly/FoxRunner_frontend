import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { LanguageService } from '../../../core/i18n/language.service';
import { getSoutenirText } from './soutenir.text';

const REPO_URL = 'https://github.com/Foxugly';

/**
 * Public "support" page (fleet standard): intro, then a grid of ways to help —
 * star the repo on GitHub, share the project (copy link), and a donation block
 * with two placeholder buttons. All copy lives in `soutenir.text.ts` (5 langs).
 */
@Component({
  selector: 'app-soutenir',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <section class="soutenir">
      <header class="soutenir__intro">
        <h1 class="soutenir__title">{{ text().intro.title }}</h1>
        <p class="soutenir__lead">{{ text().intro.lead }}</p>
      </header>

      <section class="soutenir__help">
        <h2 class="soutenir__h2">{{ text().help.title }}</h2>
        <div class="help-grid">
          <!-- Étoile GitHub -->
          <article class="help-card">
            <span class="help-card__icon help-card__icon--emerald" aria-hidden="true">
              <i class="pi pi-star"></i>
            </span>
            <h3 class="help-card__title">{{ text().help.github.title }}</h3>
            <p class="help-card__desc">{{ text().help.github.description }}</p>
            <a
              [href]="repoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="help-card__link"
            >
              <i class="pi pi-github" aria-hidden="true"></i>
              <span>{{ text().help.github.cta }}</span>
              <i class="pi pi-external-link" aria-hidden="true"></i>
            </a>
          </article>

          <!-- Partager -->
          <article class="help-card">
            <span class="help-card__icon help-card__icon--sky" aria-hidden="true">
              <i class="pi pi-share-alt"></i>
            </span>
            <h3 class="help-card__title">{{ text().help.share.title }}</h3>
            <p class="help-card__desc">{{ text().help.share.description }}</p>
            <button type="button" class="help-card__button" (click)="copyLink()">
              <i class="pi" [class.pi-copy]="!copied()" [class.pi-check]="copied()" aria-hidden="true"></i>
              <span>{{ copied() ? text().help.share.copied : text().help.share.cta }}</span>
            </button>
          </article>

          <!-- Don -->
          <article class="help-card">
            <span class="help-card__icon help-card__icon--rose" aria-hidden="true">
              <i class="pi pi-heart"></i>
            </span>
            <h3 class="help-card__title">{{ text().help.donate.title }}</h3>
            <p class="help-card__desc">{{ text().help.donate.description }}</p>
            <div class="help-card__actions">
              <!-- TODO: vrai lien de don (Renaud fournira les vraies URLs) -->
              <p-button
                [label]="text().help.donate.coffee"
                icon="pi pi-coffee"
                severity="secondary"
                [outlined]="true"
                size="small"
                (click)="openDonation()"
              />
              <!-- TODO: vrai lien de don (Renaud fournira les vraies URLs) -->
              <p-button
                [label]="text().help.donate.sponsors"
                icon="pi pi-github"
                severity="secondary"
                [outlined]="true"
                size="small"
                (click)="openDonation()"
              />
            </div>
          </article>
        </div>
      </section>
    </section>
  `,
  styleUrl: './soutenir.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoutenirComponent {
  private readonly languageService = inject(LanguageService);

  protected readonly repoUrl = REPO_URL;
  protected readonly copied = signal(false);
  protected readonly text = computed(() => getSoutenirText(this.languageService.activeLang()));

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(REPO_URL);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context / denied) — non-fatal.
    }
  }

  /** Placeholder donation action until real donation URLs are provided. */
  protected openDonation(): void {
    // TODO: remplacer par le vrai lien de don (Buy me a coffee / GitHub Sponsors).
  }
}
