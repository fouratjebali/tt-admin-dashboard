import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { AuditPageComponent } from './features/audit/audit-page.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { HealthPageComponent } from './features/health/health-page.component';
import { LoginPageComponent } from './features/login/login-page.component';
import { SettingsPageComponent } from './features/settings/settings-page.component';
import { UsersPageComponent } from './features/users/users-page.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
  },
  {
    path: '',
    component: DashboardPageComponent,
    canActivate: [authGuard],
    data: { roles: ['super_admin', 'admin'] },
    pathMatch: 'full',
  },
  {
    path: 'users',
    component: UsersPageComponent,
    canActivate: [authGuard],
    data: { roles: ['super_admin'] },
  },
  {
    path: 'health',
    component: HealthPageComponent,
    canActivate: [authGuard],
    data: { roles: ['super_admin', 'admin'] },
  },
  {
    path: 'settings',
    component: SettingsPageComponent,
    canActivate: [authGuard],
    data: { roles: ['super_admin'] },
  },
  {
    path: 'audit',
    component: AuditPageComponent,
    canActivate: [authGuard],
    data: { roles: ['super_admin'] },
  },
  {
    path: 'admin-usage',
    loadComponent: () =>
      import('./features/admin-usage/admin-usage-page.component').then(
        (component) => component.AdminUsagePageComponent,
      ),
    canActivate: [authGuard],
    data: { roles: ['super_admin'] },
  },
  {
    path: 'responsables',
    loadComponent: () =>
      import('./features/responsables/responsables-page.component').then(
        (component) => component.ResponsablesPageComponent,
      ),
    canActivate: [authGuard],
    data: { roles: ['super_admin', 'admin'] },
  },
];
