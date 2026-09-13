import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideActivity,
  LucideBell,
  LucideChevronDown,
  LucideFileClock,
  LucideLanguages,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMailCheck,
  LucideMenu,
  LucideMoon,
  LucideSearch,
  LucideSettings,
  LucideSun,
  LucideUserCog,
  LucideUsers,
  LucideX,
} from '@lucide/angular';

import { AuthService } from '../../../core/services/auth.service';
import { AdminRole } from '../../../core/models/backend-api.model';
import { Language, PreferencesService } from '../../../core/services/preferences.service';

interface NavItem {
  labelKey: keyof typeof LAYOUT_COPY.en.nav;
  route: string;
  icon: 'dashboard' | 'users' | 'health' | 'settings' | 'audit' | 'admins';
  exact: boolean;
  roles?: AdminRole[];
}

const LAYOUT_COPY = {
  en: {
    workspace: 'Admin workspace',
    search: 'Search users, drafts, imports',
    primaryNav: 'Primary navigation',
    controls: 'Workspace controls',
    languageSelector: 'Language selector',
    darkMode: 'Switch to dark mode',
    lightMode: 'Switch to light mode',
    notifications: 'Notifications',
    profileMenu: 'Profile menu',
    logout: 'Sign out',
    openMenu: 'Open navigation',
    closeMenu: 'Close navigation',
    fallbackName: 'Admin user',
    fallbackRole: 'Operations',
    nav: {
      dashboard: 'Overview',
      users: 'Users',
      health: 'Health',
      settings: 'Settings',
      audit: 'Audit log',
      responsables: 'Responsables',
    },
    queueLabel: 'Review queue',
    queueValue: '18',
    queueHint: 'pending drafts',
  },
  fr: {
    workspace: 'Espace admin',
    search: 'Rechercher users, drafts, imports',
    primaryNav: 'Navigation principale',
    controls: 'Controles espace',
    languageSelector: 'Selecteur de langue',
    darkMode: 'Activer le mode sombre',
    lightMode: 'Activer le mode clair',
    notifications: 'Notifications',
    profileMenu: 'Menu profil',
    logout: 'Deconnexion',
    openMenu: 'Ouvrir la navigation',
    closeMenu: 'Fermer la navigation',
    fallbackName: 'Admin user',
    fallbackRole: 'Operations',
    nav: {
      dashboard: 'Vue globale',
      users: 'Utilisateurs',
      health: 'Sante',
      settings: 'Parametres',
      audit: 'Journal audit',
      responsables: 'Responsables',
    },
    queueLabel: 'File de revue',
    queueValue: '18',
    queueHint: 'drafts en attente',
  },
};

const NAV_ITEMS: NavItem[] = [
  {
    labelKey: 'dashboard',
    route: '/',
    icon: 'dashboard',
    exact: true,
    roles: ['admin', 'reviewer', 'viewer'],
  },
  { labelKey: 'users', route: '/users', icon: 'users', exact: false, roles: ['admin'] },
  {
    labelKey: 'health',
    route: '/health',
    icon: 'health',
    exact: false,
    roles: ['admin', 'reviewer', 'viewer'],
  },
  { labelKey: 'settings', route: '/settings', icon: 'settings', exact: false, roles: ['admin'] },
  { labelKey: 'audit', route: '/audit', icon: 'audit', exact: false, roles: ['admin'] },
  {
    labelKey: 'responsables',
    route: '/responsables',
    icon: 'admins',
    exact: false,
    roles: ['admin'],
  },
];

@Component({
  selector: 'tt-admin-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideActivity,
    LucideBell,
    LucideChevronDown,
    LucideFileClock,
    LucideLanguages,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideMailCheck,
    LucideMenu,
    LucideMoon,
    LucideSearch,
    LucideSettings,
    LucideSun,
    LucideUserCog,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly preferences = inject(PreferencesService);
  protected readonly menuOpen = signal(false);
  protected readonly copy = computed(() => LAYOUT_COPY[this.preferences.language()]);
  protected readonly currentAdmin = this.authService.currentAdmin;
  protected readonly adminDisplayName = computed(
    () =>
      this.currentAdmin()?.display_name ??
      this.currentAdmin()?.full_name ??
      this.currentAdmin()?.name ??
      this.copy().fallbackName,
  );
  protected readonly adminRole = computed(
    () => this.currentAdmin()?.role ?? this.copy().fallbackRole,
  );
  protected readonly adminInitials = computed(() => {
    const initials = this.adminDisplayName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    return initials || 'IT';
  });

  protected readonly navItems = computed(() =>
    NAV_ITEMS.filter((item) => this.authService.canAccessRoles(item.roles)),
  );

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected setLanguage(language: Language): void {
    this.preferences.setLanguage(language);
  }

  protected logout(): void {
    this.authService.signOut().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: () => {
        void this.router.navigate(['/login']);
      },
    });
  }
}
