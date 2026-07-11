import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import fr from '../../public/i18n/fr.json';

// Global unit-test setup (referenced by angular.json test `setupFiles`).
// Every TestBed gets Transloco with the real FR translations loaded synchronously,
// so components that use `| transloco` / TranslocoService render real French text
// in unit tests (and TRANSLOCO_TRANSPILER is always provided).
beforeEach(() => {
  // Force FR so LanguageService (browser-lang detect) doesn't pick 'en' in jsdom;
  // components then render the real French text the specs assert on.
  try {
    localStorage.setItem('lang', 'fr');
  } catch {
    /* localStorage unavailable — non-fatal */
  }
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { fr },
        translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' },
        preloadLangs: true,
      }),
    ],
  });
});
