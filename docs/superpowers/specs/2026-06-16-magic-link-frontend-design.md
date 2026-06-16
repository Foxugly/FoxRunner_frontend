# FoxRunner frontend — magic-link (passwordless) login UI

**Date:** 2026-06-16
**Statut:** design approuvé, prêt pour le plan d'implémentation
**Sous-projet:** B (frontend). Dépend du sous-projet A (backend `FoxRunner_server`) qui fige le contrat.
**Cibles:** `FoxRunner_frontend` (Angular 21) **et** le fork `FoxRunner_frontend_node20` (Angular 19) — design identique, appliqué deux fois.

## Problème

Offrir une connexion **par lien magique** sur la page de login, même look & feel que quizonline/tm :
formulaire mot de passe par défaut + une bascule « lien magique » (email seul → « envoyer le
lien »), plus une page d'atterrissage `/auth/magic/:token` qui échange le token contre un JWT et
connecte l'utilisateur.

## Contrat backend (sous-projet A)

- `POST /api/v1/auth/magic-link/request` `{ email }` → **202** silencieux (toujours, anti-énumération).
- `POST /api/v1/auth/magic-link/exchange` `{ token }` → **200** `{ access_token, token_type:"bearer" }` ;
  **410** lien expiré ; **400** lien invalide.

## Architecture / fichiers (par frontend)

### `core/api/auth-magic.service.ts` (nouveau)
Mirror de `auth-password.service.ts` (HttpClient + `environment.apiBaseUrl`) :
```text
@Injectable({ providedIn: 'root' })
class AuthMagicService {
  request(email: string): Promise<void>                       // POST /auth/magic-link/request
  exchange(token: string): Promise<{ access_token: string; token_type: string }>  // POST /auth/magic-link/exchange
}
```

### `core/auth/auth.service.ts` (modifié)
Ajouter une méthode publique réutilisant les internes existants (signal `_token`, `refreshCurrentUser`) :
```text
async loginWithToken(accessToken: string): Promise<void>      // pose le token + refreshCurrentUser()
```
(Le `login(email, password)` actuel reste inchangé.)

### `features/auth/login/login.component.ts` (modifié)
- Signal `magicMode = signal(false)`.
- **Mode mot de passe (défaut)** : formulaire email+password existant inchangé + lien « Mot de passe
  oublié ? ». Sous le bouton « Se connecter », un bouton secondaire **« Recevoir un lien magique »**
  → `magicMode.set(true)`.
- **Mode lien magique** : un seul champ email + bouton **« Envoyer le lien »** → `authMagic.request(email)` →
  message succès « Si un compte existe, un lien vient d'être envoyé. Vérifie ta boîte mail. »
  (neutre, anti-énumération). Bouton secondaire **« Retour au mot de passe »** → `magicMode.set(false)`.
- Réutilise les composants/disposition de la carte de login existante (p-card, p-button, p-message,
  ReactiveForms) — cohérent avec le chrome emerald.

### `features/auth/magic-link-exchange/magic-link-exchange.component.ts` (nouveau)
- Lit `:token` via `ActivatedRoute`. Si absent → état « invalide ».
- `ngOnInit` : spinner (`p-progressspinner`), appelle `authMagic.exchange(token)`.
  - **succès** : `auth.loginWithToken(res.access_token)` → `router.navigate(['/'])`.
  - **410** : état « expiré » — « Ce lien a expiré (15 min). Demande-en un nouveau. »
  - **400 / autre** : état « invalide » — « Lien invalide. »
  - Erreurs avec un lien **« Retour à la connexion »** (`routerLink="/login"`).
- Carte centrée, même style que login.

### `app.routes.ts` (modifié)
Ajouter, à côté des routes auth (`login`, `forgot-password`, `reset-password`) :
```text
{ path: 'auth/magic/:token', loadComponent: () => import(... MagicLinkExchangeComponent) }
```
Route publique (hors `authGuard`).

## Tests (vitest)

- `AuthMagicService` : `request`/`exchange` POSTent les bons chemins/corps (HttpTestingController),
  `exchange` retourne `{access_token, token_type}`.
- `AuthService.loginWithToken` : pose le token et déclenche `refreshCurrentUser` (mock).
- `MagicLinkExchangeComponent` : monte ; sur exchange OK → appelle `loginWithToken` + navigue ;
  sur 410 → état « expiré » ; sur 400 → état « invalide » (stubs).
- `LoginComponent` : bascule `magicMode` affiche le champ email / masque le password.
- `npm run build`, lint, suite verts (les 2 repos ; fork via `npm test`).

## Déploiement / ordre

1. Backend (sous-projet A) déployé → endpoints en ligne.
2. (Optionnel) `npm run gen:api` régénère `schema.ts` avec les nouveaux endpoints (les services
   hand-written n'en dépendent pas, comme `auth-password`).
3. `FoxRunner_frontend` (upstream) : implémenter, PR, merge.
4. `FoxRunner_frontend_node20` (fork) : rejouer à l'identique (Angular 19 — `ActivatedRoute`,
   signals, `p-progressspinner`, ReactiveForms existent en v19), `git pull` d'abord, PR, merge.

## Hors périmètre

- Le backend (sous-projet A).
- Tout autre mode d'auth (OTP, social). i18n des libellés (FR only, comme le reste de l'app).
- La passe « liens emerald » (le lien bleu de login) — séparée.
