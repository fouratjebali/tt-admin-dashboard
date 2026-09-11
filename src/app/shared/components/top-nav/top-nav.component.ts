import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
    role: 'Operations',
  },
  fr: {
    dashboard: 'Tableau',
    users: 'Utilisateurs',
    health: 'Santé',
    settings: 'Paramètres',
    audit: 'Audit',
    admins: 'Admins',
    primaryNav: 'Navigation principale',
    darkMode: 'Activer le mode sombre',
    lightMode: 'Activer le mode clair',
    notifications: 'Notifications',
    languageSelector: 'Sélecteur de langue',
    role: 'Opérations',
  },
};

@Component({
  selector: 'tt-top-nav',
  imports: [RouterLink, RouterLinkActive, TtIconComponent],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss',
})
export class TtTopNavComponent {
  protected readonly preferences = inject(PreferencesService);
  protected readonly copy = computed(() => NAV_LABELS[this.preferences.language()]);

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
}
