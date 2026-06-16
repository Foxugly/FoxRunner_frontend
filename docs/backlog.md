# Backlog

Suivi des éléments ouverts. Mis à jour 2026-06-16.

## Ops / activation (action manuelle)

- [ ] **Définir `APP_MAGIC_LINK_URL` en SSM `/foxrunner/prod`** — l'URL frontend de prod du lien
  magique (ex. `https://<frontend-prod>/auth/magic`). Sans ça, les emails de lien magique pointent
  sur le défaut `http://localhost:4200/auth/magic`. Le Graph mail est déjà configuré (réutilisé du
  reset-password) — rien d'autre à poser. _Repo : FoxRunner_server (config, pas de code)._
- [ ] **Déployer les frontends** (`FoxRunner_frontend` + `FoxRunner_frontend_node20`) avec la
  feature lien magique. Le backend `FoxRunner_server` auto-deploy au merge sur `main` (déjà fait).

## Frontend — polish

- [ ] **Passe « liens emerald »** — remplacer les liens par défaut en bleu par de l'emerald/gris
  neutre, conformément à `OPERATIONS.md §3.15` (« pas d'accent bleu »). Cas connu : le lien
  « Mot de passe oublié ? » sur la page de login. Vérifier aussi les autres liens texte de l'app.
  _Repos : FoxRunner_frontend **et** FoxRunner_frontend_node20 (à répliquer)._

## Idées / non planifié

- [ ] Composant de table : étendre `app-data-table` aux journaux serveur (jobs/history/audit/
  artifacts/graph) si un vrai search/sort serveur est ajouté côté backend (`FoxRunner_server`
  n'expose pas de paramètre `search`/`sort` aujourd'hui).
- [ ] i18n fr/en de l'UI FoxRunner (actuellement FR only ; PrimeNG est déjà traduit).
