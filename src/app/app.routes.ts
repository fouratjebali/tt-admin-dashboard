import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { AdminsPageComponent } from './features/admins/admins-page.component';
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
    pathMatch: 'full',
  },
  {
    path: 'users',
    component: UsersPageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'health',
    component: HealthPageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    component: SettingsPageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'audit',
    component: AuditPageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'admins',
    component: AdminsPageComponent,
    canActivate: [authGuard],
  },
];
