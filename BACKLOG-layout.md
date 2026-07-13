# Backlog — harmonisation layout · FoxRunner_frontend (A21)

> **Cible :** `STANDARD-frontend-layout.md` (repo `foxugly-ops`).
> **Statut : ✅ 100 % CONFORME — RÉFÉRENCE de la flotte** (audit 2026-07-11, mergé dans `main`).

FoxRunner_frontend implémente l'intégralité du standard (les 8 briques + design tokens +
i18n Transloco 5 langues + pages publiques + `app-auth-card`) et sert d'implémentation de
référence pour les autres fronts.

## Reste — sécurité auth (nécessite config backend, hors layout)
- [ ] **Turnstile (Cloudflare)** sur **`register`** et **`forgot-password`** (convention flotte,
  cf. `Pages d'authentification` du standard). Composant à câbler (réf `PushIT_frontend/src/app/shared/turnstile/`)
  + clés `TURNSTILE_*` en SSM côté déploiement. Aujourd'hui **absent**.
- [x] Valider le **flux d'activation email** du register self-service côté backend.
  Fait : register (Ninja) crée un compte **inactif** + envoie un lien d'activation (token
  `TimestampSigner`, TTL 24 h, anti-énumération 202) ; endpoint `/auth/activate` active
  + vérifie le compte ; front = page `/activate/:token`. (branche `feat/register-email-activation`)

_Hors périmètre (rappel) :_ pages Features/About marketing = N/A (outil interne) ; cloches = N/A.
