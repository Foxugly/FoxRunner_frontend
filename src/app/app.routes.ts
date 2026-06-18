import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { superuserGuard } from './core/auth/superuser.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'auth/magic/:token',
    loadComponent: () =>
      import('./features/auth/magic-link-exchange/magic-link-exchange.component').then(
        (m) => m.MagicLinkExchangeComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'scenarios',
        loadComponent: () =>
          import('./features/scenarios/list/scenarios-list.component').then(
            (m) => m.ScenariosListComponent,
          ),
      },
      {
        path: 'scenarios/new',
        loadComponent: () =>
          import('./features/scenarios/edit/scenario-edit.component').then(
            (m) => m.ScenarioEditComponent,
          ),
      },
      {
        path: 'scenarios/:id',
        loadComponent: () =>
          import('./features/scenarios/detail/scenario-detail.component').then(
            (m) => m.ScenarioDetailComponent,
          ),
      },
      {
        path: 'scenarios/:id/edit',
        loadComponent: () =>
          import('./features/scenarios/edit/scenario-edit.component').then(
            (m) => m.ScenarioEditComponent,
          ),
      },
      {
        path: 'scenarios/:id/steps',
        loadComponent: () =>
          import(
            './features/scenarios/step-collections-editor/step-collections-editor.component'
          ).then((m) => m.StepCollectionsEditorComponent),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./features/jobs/list/jobs-list.component').then((m) => m.JobsListComponent),
      },
      {
        path: 'jobs/:id',
        loadComponent: () =>
          import('./features/jobs/detail/job-detail.component').then(
            (m) => m.JobDetailComponent,
          ),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/history/history.component').then((m) => m.HistoryComponent),
      },
      {
        path: 'plan',
        loadComponent: () =>
          import('./features/plan/plan.component').then((m) => m.PlanComponent),
      },
      {
        path: 'admin',
        canActivate: [superuserGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/admin/home/admin-home.component').then(
                (m) => m.AdminHomeComponent,
              ),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./features/admin/users/admin-users.component').then(
                (m) => m.AdminUsersComponent,
              ),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./features/admin/settings/admin-settings.component').then(
                (m) => m.AdminSettingsComponent,
              ),
          },
          {
            path: 'audit',
            loadComponent: () =>
              import('./features/admin/audit/admin-audit.component').then(
                (m) => m.AdminAuditComponent,
              ),
          },
          {
            path: 'health',
            loadComponent: () =>
              import('./features/admin/health/admin-health.component').then(
                (m) => m.AdminHealthComponent,
              ),
          },
          {
            path: 'retention',
            loadComponent: () =>
              import('./features/admin/retention/admin-retention.component').then(
                (m) => m.AdminRetentionComponent,
              ),
          },
          {
            path: 'catalog',
            loadComponent: () =>
              import('./features/admin/catalog/admin-catalog.component').then(
                (m) => m.AdminCatalogComponent,
              ),
          },
          {
            path: 'artifacts',
            loadComponent: () =>
              import('./features/admin/artifacts/admin-artifacts.component').then(
                (m) => m.AdminArtifactsComponent,
              ),
          },
          {
            path: 'graph',
            loadComponent: () =>
              import('./features/admin/graph/admin-graph.component').then(
                (m) => m.AdminGraphComponent,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
