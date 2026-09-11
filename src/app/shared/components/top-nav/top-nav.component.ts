import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { Language, PreferencesService } from '../../../core/services/preferences.service';
import { TtIconComponent } from '../icon/icon.component';

interface NavItem {
  labelKey: keyof typeof NAV_LABELS.en;
  route: string;
  icon: string;
  exact: boolean;
}

const NAV_LABELS = {
  en: {
    dashboard: 'Dashboard',
    users: 'Users',
    health: 'Health',
    settings: 'Settings',
    audit: 'Audit',
    admins: 'Admins',
    primaryNav: 'Primary',
    darkMode: 'Switch to dark mode',
    lightMode: 'Switch to light mode',
    notifications: 'Notifications',
    languageSelector: 'Language selector',
    logout: 'Sign out',
    role: 'Operations',
    fallbackName: 'Admin user',
  },
  fr: {
    dashboard: 'Tableau',
    users: 'Utilisateurs',
    health: 'Sante',
    settings: 'Parametres',
    audit: 'Audit',
    admins: 'Admins',
    primaryNav: 'Navigation principale',
    darkMode: 'Activer le mode sombre',
    lightMode: 'Activer le mode clair',
    notifications: 'Notifications',
    languageSelector: 'Selecteur de langue',
    logout: 'Deconnexion',
    role: 'Operations',
    fallbackName: 'Admin user',
  },
};

@Component({
  selector: 'tt-top-nav',
  imports: [RouterLink, RouterLinkActive, TtIconComponent],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss',
})
export class TtTopNavComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly preferences = inject(PreferencesService);
  protected readonly copy = computed(() => NAV_LABELS[this.preferences.language()]);
  protected readonly currentAdmin = this.authService.currentAdmin;
  protected readonly adminDisplayName = computed(
    () => this.currentAdmin()?.full_name ?? this.currentAdmin()?.name ?? this.copy().fallbackName,
  );
  protected readonly adminRole = computed(() => this.currentAdmin()?.role ?? this.copy().role);
  protected readonly adminInitials = computed(() => {
    const initials = this.adminDisplayName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    return initials || 'IT';
  });

  protected readonly navItems: NavItem[] = [
    { labelKey: 'dashboard', route: '/', icon: 'dashboard', exact: true },
    { labelKey: 'users', route: '/users', icon: 'users', exact: false },
    { labelKey: 'health', route: '/health', icon: 'health', exact: false },
    { labelKey: 'settings', route: '/settings', icon: 'settings', exact: false },
    { labelKey: 'audit', route: '/audit', icon: 'audit', exact: false },
    { labelKey: 'admins', route: '/admins', icon: 'admins', exact: false },
  ];

  protected setLanguage(language: Language): void {
    this.preferences.setLanguage(language);
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
