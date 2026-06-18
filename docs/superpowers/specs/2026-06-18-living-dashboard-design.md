# Design — Dashboard « vivant » (UX refactor zone 3)

> Zone 3. Frontend-only (le backend expose déjà `/system/status`,
> `/users/{id}/plan`, `/jobs`, `/users/{id}/history`, `/users/{id}/scenarios`,
> `/slots`). Repos : `FoxRunner_frontend` (A21), `FoxRunner_frontend_node20` (A19).

## Problème
Le tableau de bord actuel n'affiche que 4 cartes « Ouvrir » (navigation), aucune
donnée. Renaud : « on voit rien, juste des boutons ». Et son scheduleur avait
planté → la santé du système doit être visible d'un coup d'œil.

## Objectif
Remplacer la grille de boutons par des **tuiles vivantes** (les accès restent
dans le menu) :
1. **Santé du système** — scheduler / base / redis (+ celery) via
   `GET /system/status`, poll ~30 s ; états ok/down/disabled, et la commande de
   relance affichée si un service requis est down.
2. **Prochaine exécution** — `GET /users/{id}/plan` : scénario + compte à
   rebours vers `scheduled_for` (null → « aucun créneau planifié »).
3. **Activité récente** — les derniers **jobs** (`GET /jobs?limit=5`) : statut +
   scénario + quand, lien vers la vue d'exécution `/jobs/{job_id}` (et un lien
   « voir l'échec » mis en avant pour les jobs `failed`).
4. **Compteurs (KPIs)** — nombre de scénarios, créneaux actifs, jobs actifs
   (queued+running).

## Composants

### `SystemStatusService` (nouveau) — `core/api/system-status.service.ts`
- `get(): Promise<SystemStatus>` → `GET /system/status`.
- Types hand-définis (le backend renvoie `checks` en dict libre) :
  ```ts
  interface SystemCheck { status: string; required?: boolean; detail?: string; command?: string; }
  interface SystemStatus { status: 'ok'|'degraded'|'down'; generated_at: string; down: string[]; checks: Record<string, SystemCheck>; }
  ```
  (pas de regen `schema.ts` — on évite d'entremêler les branches ; cohérent avec
  le `Plan` déjà hand-défini dans `types.ts`.)

### `DashboardComponent` (réécrit)
- Signals : `system`, `plan`, `recentJobs`, `counts`, + `loading`.
- `ngOnInit` → `load()` : fetch en parallèle (system, plan, jobs?limit=5,
  scenarios total, slots, jobs actifs). Chaque appel tolère l'échec
  indépendamment (une tuile en erreur n'écroule pas les autres).
- **Poll 30 s** pour rafraîchir la santé système (et l'activité) ; `clearInterval`
  en `ngOnDestroy`. Compte à rebours du plan : un signal d'horloge (tick 1 s) ou
  recalcul à l'affichage rafraîchi.
- Labels FR des checks : database→Base, redis→Redis, celery_worker→Celery worker,
  celery_beat→Celery beat, scheduler→Scheduleur. Icône/teinte par statut
  (ok=vert, down=rouge, disabled=gris).
- Réutilise `PlanService`, `JobsService`, `ScenariosService`, `SlotsService`,
  `AuthService`, `ApiDatePipe`, `StatusTagComponent`, `PageHeaderComponent`.

## Tests
- `SystemStatusService.get()` (vitest) : `GET /system/status` → renvoie le corps.
- Lint + build + vitest verts sur les deux repos.

## Hors périmètre
- Pas de changement backend. Pas de graphes/historique long. Pas de WebSocket
  (poll, cohérent avec la vue d'exécution). Pas de bandeau d'alarme global ici
  (séparé ; ce dashboard ne fait que la tuile santé).
