import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { primeNgFrenchTranslation } from './core/i18n/primeng-fr';

// Emerald is the single fleet accent (OPERATIONS.md §3.15). Remap BOTH the
// `primary` semantic AND the `green` primitive onto Emerald so that
// `severity="success"` buttons/tags render in the exact same emerald as
// `primary` — otherwise `success` would fall back to PrimeNG's default green
// (#22c55e), giving two mismatched greens across the UI.
const EMERALD_SCALE = {
  50: '{emerald.50}',
  100: '{emerald.100}',
  200: '{emerald.200}',
  300: '{emerald.300}',
  400: '{emerald.400}',
  500: '{emerald.500}',
  600: '{emerald.600}',
  700: '{emerald.700}',
  800: '{emerald.800}',
  900: '{emerald.900}',
  950: '{emerald.950}',
} as const;

const FoxAura = definePreset(Aura, {
  primitive: {
    green: { ...EMERALD_SCALE },
  },
  semantic: {
    primary: { ...EMERALD_SCALE },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: FoxAura,
        options: {
          prefix: 'p',
          darkModeSelector: '.fox-dark',
          cssLayer: false,
        },
      },
      translation: primeNgFrenchTranslation,
    }),
    MessageService,
    ConfirmationService,
  ],
};
