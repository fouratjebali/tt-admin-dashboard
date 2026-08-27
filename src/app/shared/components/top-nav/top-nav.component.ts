import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { TtIconComponent } from '../icon/icon.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  exact: boolean;
}

@Component({
  selector: 'tt-top-nav',
  imports: [RouterLink, RouterLinkActive, TtIconComponent],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss',
})
export class TtTopNavComponent {
  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/', icon: 'dashboard', exact: true },
    { label: 'Users', route: '/users', icon: 'users', exact: false },
    { label: 'Health', route: '/health', icon: 'health', exact: false },
    { label: 'Settings', route: '/settings', icon: 'settings', exact: false },
    { label: 'Audit', route: '/audit', icon: 'audit', exact: false },
    { label: 'Admins', route: '/admins', icon: 'admins', exact: false },
  ];
}
