import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
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
        path: 'slots',
        loadComponent: () =>
          import('./features/slots/list/slots-list.component').then(
            (m) => m.SlotsListComponent,
          ),
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
    ],
  },
  { path: '**', redirectTo: '' },
];
