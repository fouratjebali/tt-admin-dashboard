import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleCheck,
  LucideCircleOff,
  LucideRefreshCw,
  LucideSearch,
  LucideShieldCheck,
  LucideUserCog,
  LucideUsers,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import { AdminRole, AdminUser, PaginatedResponse } from '../../core/models/backend-api.model';
import { ApiService } from '../../core/services/api.service';
import { PreferencesService } from '../../core/services/preferences.service';

type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = 'all' | AdminRole;

const PAGE_SIZE = 20;

const COPY = {
  en: {
    eyebrow: 'User management',
    title: 'Users',
    body: 'Manage employee access, roles, and account status from the admin user directory.',
    refresh: 'Refresh',
    search: 'Search by name or email',
    roleFilter: 'Role',
    statusFilter: 'Status',
    allRoles: 'All roles',
    allStatuses: 'All statuses',
    active: 'Active',
    inactive: 'Inactive',
    user: 'User',
    role: 'Role',
    status: 'Status',
    lastLogin: 'Last login',
    created: 'Created',
    actions: 'Actions',
    activate: 'Activate',
    deactivate: 'Deactivate',
    retry: 'Retry',
    loading: 'Loading users',
    emptyTitle: 'No users found',
    emptyBody: 'Try a different search term or filter.',
    range: 'Showing',
    of: 'of',
    previous: 'Previous page',
    next: 'Next page',
    totals: {
      total: 'Total users',
      active: 'Active users',
      admins: 'Privileged roles',
      inactive: 'Inactive users',
    },
    errors: {
      load: 'Unable to load users from the admin API.',
      role: 'Unable to update this user role.',
      status: 'Unable to update this user status.',
      network: 'Admin API is unreachable. Check backend and proxy configuration.',
    },
  },
  fr: {
    eyebrow: 'Gestion utilisateurs',
    title: 'Utilisateurs',
    body: 'Gerez les acces employes, les roles et le statut des comptes depuis le repertoire admin.',
    refresh: 'Actualiser',
    search: 'Rechercher par nom ou email',
    roleFilter: 'Role',
    statusFilter: 'Statut',
    allRoles: 'Tous les roles',
    allStatuses: 'Tous les statuts',
    active: 'Actif',
    inactive: 'Inactif',
    user: 'Utilisateur',
    role: 'Role',
    status: 'Statut',
    lastLogin: 'Derniere connexion',
    created: 'Creation',
    actions: 'Actions',
    activate: 'Activer',
    deactivate: 'Desactiver',
    retry: 'Reessayer',
    loading: 'Chargement utilisateurs',
    emptyTitle: 'Aucun utilisateur',
    emptyBody: 'Essayez une autre recherche ou un autre filtre.',
    range: 'Affichage',
    of: 'sur',
    previous: 'Page precedente',
    next: 'Page suivante',
    totals: {
      total: 'Total users',
      active: 'Users actifs',
      admins: 'Roles privilegies',
      inactive: 'Users inactifs',
    },
    errors: {
      load: "Impossible de charger les utilisateurs depuis l'API admin.",
      role: 'Impossible de modifier le role de cet utilisateur.',
      status: 'Impossible de modifier le statut de cet utilisateur.',
      network: 'API admin inaccessible. Verifiez le backend et le proxy.',
    },
  },
};

@Component({
  selector: 'app-users-page',
  imports: [
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleCheck,
    LucideCircleOff,
    LucideRefreshCw,
    LucideSearch,
    LucideShieldCheck,
    LucideUserCog,
    LucideUsers,
  ],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
})
export class UsersPageComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly preferences = inject(PreferencesService);
  private searchDebounce?: ReturnType<typeof setTimeout>;

  protected readonly copy = computed(() => COPY[this.preferences.language()]);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly total = signal(0);
  protected readonly offset = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly savingUserId = signal('');
  protected readonly searchTerm = signal('');
  protected readonly roleFilter = signal<RoleFilter>('all');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly roles: AdminRole[] = ['admin', 'reviewer', 'viewer', 'user'];

  protected readonly filteredUsers = computed(() =>
    this.users().filter((user) => {
      const roleMatches = this.roleFilter() === 'all' || user.role === this.roleFilter();
      const statusMatches =
        this.statusFilter() === 'all' ||
        (this.statusFilter() === 'active' ? user.is_active : !user.is_active);

      return roleMatches && statusMatches;
    }),
  );

  protected readonly stats = computed(() => {
    const users = this.users();
    const active = users.filter((user) => user.is_active).length;
    const privileged = users.filter(
      (user) => user.role === 'admin' || user.role === 'reviewer',
    ).length;

    return [
      { label: this.copy().totals.total, value: this.total() || users.length, tone: 'neutral' },
      { label: this.copy().totals.active, value: active, tone: 'success' },
      { label: this.copy().totals.admins, value: privileged, tone: 'accent' },
      { label: this.copy().totals.inactive, value: users.length - active, tone: 'warning' },
    ];
  });

  protected readonly pageStart = computed(() =>
    this.total() === 0 && this.users().length === 0 ? 0 : this.offset() + 1,
  );
  protected readonly pageEnd = computed(() =>
    Math.min(this.offset() + this.users().length, this.total() || this.users().length),
  );
  protected readonly canGoPrevious = computed(() => this.offset() > 0 && !this.loading());
  protected readonly canGoNext = computed(
    () => this.offset() + PAGE_SIZE < this.total() && !this.loading(),
  );

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  protected loadUsers(): void {
    this.loading.set(true);
    this.error.set('');

    this.apiService
      .listUsers({
        search: this.searchTerm().trim(),
        limit: PAGE_SIZE,
        offset: this.offset(),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const users = this.normalizeUsersResponse(response);
          this.users.set(users.items);
          this.total.set(users.total);
        },
        error: (error: unknown) => {
          this.error.set(this.errorMessage(error, this.copy().errors.load));
          this.users.set([]);
          this.total.set(0);
        },
      });
  }

  protected updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);

    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }

    this.searchDebounce = setTimeout(() => {
      this.offset.set(0);
      this.loadUsers();
    }, 280);
  }

  protected updateRoleFilter(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.roleFilter.set(select.value as RoleFilter);
  }

  protected updateStatusFilter(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.statusFilter.set(select.value as StatusFilter);
  }

  protected changeUserRole(user: AdminUser, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nextRole = select.value as AdminRole;

    if (nextRole === user.role) {
      return;
    }

    this.savingUserId.set(`${this.userId(user)}:role`);
    this.error.set('');

    this.apiService
      .updateUserRole(this.userId(user), nextRole)
      .pipe(finalize(() => this.savingUserId.set('')))
      .subscribe({
        next: (updatedUser) => this.replaceUser(updatedUser),
        error: (error: unknown) => {
          select.value = user.role;
          this.error.set(this.errorMessage(error, this.copy().errors.role));
        },
      });
  }

  protected toggleUserStatus(user: AdminUser): void {
    this.savingUserId.set(`${this.userId(user)}:status`);
    this.error.set('');

    this.apiService
      .updateUserActive(this.userId(user), !user.is_active)
      .pipe(finalize(() => this.savingUserId.set('')))
      .subscribe({
        next: (updatedUser) => this.replaceUser(updatedUser),
        error: (error: unknown) => {
          this.error.set(this.errorMessage(error, this.copy().errors.status));
        },
      });
  }

  protected previousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.offset.update((offset) => Math.max(0, offset - PAGE_SIZE));
    this.loadUsers();
  }

  protected nextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.offset.update((offset) => offset + PAGE_SIZE);
    this.loadUsers();
  }

  protected userInitials(user: AdminUser): string {
    const name = user.full_name || user.email;
    const initials = name
      .split(/[.\s@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    return initials || 'U';
  }

  protected displayName(user: AdminUser): string {
    return user.full_name || user.email.split('@')[0] || user.email;
  }

  protected formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(this.preferences.language() === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'medium',
    }).format(date);
  }

  protected isSaving(user: AdminUser, action: 'role' | 'status'): boolean {
    return this.savingUserId() === `${this.userId(user)}:${action}`;
  }

  protected userId(user: AdminUser): string {
    return user.id ?? user.user_id ?? user.email;
  }

  private replaceUser(updatedUser: AdminUser): void {
    this.users.update((users) =>
      users.map((user) => (this.userId(user) === this.userId(updatedUser) ? updatedUser : user)),
    );
  }

  private normalizeUsersResponse(response: PaginatedResponse<AdminUser> | AdminUser[]): {
    items: AdminUser[];
    total: number;
  } {
    if (Array.isArray(response)) {
      return {
        items: response,
        total: response.length,
      };
    }

    return {
      items: response.items ?? [],
      total: response.total ?? response.items?.length ?? 0,
    };
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.copy().errors.network;
    }

    return fallback;
  }
}
