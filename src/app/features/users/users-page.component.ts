import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleCheck,
  LucideCircleOff,
  LucideEye,
  LucidePencil,
  LucideRefreshCw,
  LucideSearch,
  LucideShieldCheck,
  LucideTrash2,
  LucideUserCog,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { Observable, catchError, finalize, forkJoin, of } from 'rxjs';

import { AdminRole, AdminUser, PaginatedResponse } from '../../core/models/backend-api.model';
import { ApiService } from '../../core/services/api.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { backendErrorMessage, isNetworkError } from '../../core/utils/api-error.util';

type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = 'all' | AdminRole;
type UserSource = 'admin-account' | 'directory-user';
type DetailMode = 'view' | 'edit';

type ManagedUser = AdminUser & {
  source: UserSource;
};

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
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    activate: 'Activate',
    deactivate: 'Deactivate',
    details: 'User details',
    deleteDisabled: 'Delete will be enabled after the backend CRUD API is ready.',
    source: 'Source',
    email: 'Email',
    accountSource: 'Admin account',
    directorySource: 'User directory',
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
    view: 'Voir',
    edit: 'Modifier',
    delete: 'Supprimer',
    close: 'Fermer',
    activate: 'Activer',
    deactivate: 'Desactiver',
    details: 'Details utilisateur',
    deleteDisabled: 'La suppression sera active apres ajout de l API CRUD backend.',
    source: 'Source',
    email: 'Email',
    accountSource: 'Compte admin',
    directorySource: 'Repertoire users',
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
    LucideEye,
    LucidePencil,
    LucideRefreshCw,
    LucideSearch,
    LucideShieldCheck,
    LucideTrash2,
    LucideUserCog,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
})
export class UsersPageComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly preferences = inject(PreferencesService);
  private searchDebounce?: ReturnType<typeof setTimeout>;

  protected readonly copy = computed(() => COPY[this.preferences.language()]);
  protected readonly users = signal<ManagedUser[]>([]);
  protected readonly total = signal(0);
  protected readonly offset = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly savingUserId = signal('');
  protected readonly searchTerm = signal('');
  protected readonly roleFilter = signal<RoleFilter>('all');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly selectedUser = signal<ManagedUser | null>(null);
  protected readonly detailMode = signal<DetailMode>('view');
  protected readonly roles: AdminRole[] = ['super_admin', 'admin', 'user'];

  protected readonly filteredUsers = computed(() =>
    this.users().filter((user) => {
      const search = this.searchTerm().trim().toLowerCase();
      const searchMatches =
        !search ||
        [this.displayName(user), user.email, user.username, user.role]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(search));
      const roleMatches = this.roleFilter() === 'all' || user.role === this.roleFilter();
      const statusMatches =
        this.statusFilter() === 'all' ||
        (this.statusFilter() === 'active' ? user.is_active : !user.is_active);

      return searchMatches && roleMatches && statusMatches;
    }),
  );
  protected readonly visibleUsers = computed(() =>
    this.filteredUsers().slice(this.offset(), this.offset() + PAGE_SIZE),
  );

  protected readonly stats = computed(() => {
    const users = this.users();
    const active = users.filter((user) => user.is_active).length;
    const privileged = users.filter(
      (user) => user.role === 'super_admin' || user.role === 'admin',
    ).length;

    return [
      { label: this.copy().totals.total, value: this.total() || users.length, tone: 'neutral' },
      { label: this.copy().totals.active, value: active, tone: 'success' },
      { label: this.copy().totals.admins, value: privileged, tone: 'accent' },
      { label: this.copy().totals.inactive, value: users.length - active, tone: 'warning' },
    ];
  });

  protected readonly pageStart = computed(() =>
    this.filteredUsers().length === 0 ? 0 : this.offset() + 1,
  );
  protected readonly pageEnd = computed(() =>
    Math.min(this.offset() + this.visibleUsers().length, this.filteredUsers().length),
  );
  protected readonly canGoPrevious = computed(() => this.offset() > 0 && !this.loading());
  protected readonly canGoNext = computed(
    () => this.offset() + PAGE_SIZE < this.filteredUsers().length && !this.loading(),
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

    const search = this.searchTerm().trim();
    const endpointErrors: string[] = [];

    forkJoin({
      adminAccounts: this.apiService
        .listAdminAccounts({ search, limit: 200, offset: 0 })
        .pipe(catchError((error: unknown) => this.usersFallback(error, endpointErrors))),
      directoryUsers: this.apiService
        .listUsers({ search, limit: 200, offset: 0 })
        .pipe(catchError((error: unknown) => this.usersFallback(error, endpointErrors))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ adminAccounts, directoryUsers }) => {
          const admins = this.normalizeUsersResponse(adminAccounts, 'admin-account').items;
          const users = this.normalizeUsersResponse(directoryUsers, 'directory-user').items;
          const merged = this.mergeUsers(users, admins);

          this.users.set(merged);
          this.total.set(merged.length);

          if (!adminAccounts && !directoryUsers) {
            this.error.set(endpointErrors[0] ?? this.copy().errors.load);
          }
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
    this.offset.set(0);
  }

  protected updateStatusFilter(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.statusFilter.set(select.value as StatusFilter);
    this.offset.set(0);
  }

  protected changeUserRole(user: ManagedUser, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nextRole = select.value as AdminRole;

    if (nextRole === user.role) {
      return;
    }

    this.savingUserId.set(`${this.userId(user)}:role`);
    this.error.set('');

    const request: Observable<unknown> =
      user.source === 'admin-account'
        ? this.apiService.updateAdminAccount(this.userId(user), {
            username: user.username,
            email: user.email,
            display_name: user.display_name ?? user.full_name ?? user.name,
            role: nextRole,
            is_active: user.is_active,
          })
        : this.apiService.updateUserRole(this.userId(user), nextRole);

    request.pipe(finalize(() => this.savingUserId.set(''))).subscribe({
      next: (updatedUser) => this.replaceUser(this.normalizeUser(updatedUser, user.source)),
      error: (error: unknown) => {
        select.value = user.role;
        this.error.set(this.errorMessage(error, this.copy().errors.role));
      },
    });
  }

  protected toggleUserStatus(user: ManagedUser): void {
    this.savingUserId.set(`${this.userId(user)}:status`);
    this.error.set('');

    const request: Observable<unknown> =
      user.source === 'admin-account'
        ? this.apiService.updateAdminAccountActive(this.userId(user), !user.is_active)
        : this.apiService.updateUserActive(this.userId(user), !user.is_active);

    request.pipe(finalize(() => this.savingUserId.set(''))).subscribe({
      next: (updatedUser) => this.replaceUser(this.normalizeUser(updatedUser, user.source)),
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

  protected viewUser(user: ManagedUser): void {
    this.detailMode.set('view');
    this.selectedUser.set(user);
  }

  protected editUser(user: ManagedUser): void {
    this.detailMode.set('edit');
    this.selectedUser.set(user);
  }

  protected closeUserDetails(): void {
    this.selectedUser.set(null);
  }

  protected userSourceLabel(user: ManagedUser): string {
    return user.source === 'admin-account'
      ? this.copy().accountSource
      : this.copy().directorySource;
  }

  protected userInitials(user: AdminUser): string {
    const name = user.display_name || user.full_name || user.name || user.username || user.email;
    const initials = name
      .split(/[.\s@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    return initials || 'U';
  }

  protected displayName(user: AdminUser): string {
    return (
      user.display_name ||
      user.full_name ||
      user.name ||
      user.username ||
      user.email.split('@')[0] ||
      user.email
    );
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
    return user.id ?? user.user_id ?? user.username ?? user.email;
  }

  private replaceUser(updatedUser: ManagedUser): void {
    this.users.update((users) =>
      users.map((user) => (this.userId(user) === this.userId(updatedUser) ? updatedUser : user)),
    );

    if (this.selectedUser() && this.userId(this.selectedUser()!) === this.userId(updatedUser)) {
      this.selectedUser.set(updatedUser);
    }
  }

  private normalizeUsersResponse(
    response: PaginatedResponse<AdminUser> | AdminUser[] | null,
    source: UserSource,
  ): {
    items: ManagedUser[];
    total: number;
  } {
    if (!response) {
      return { items: [], total: 0 };
    }

    if (Array.isArray(response)) {
      const items = response.map((user) => this.normalizeUser(user, source));

      return {
        items,
        total: items.length,
      };
    }

    const items = this.userArrayFrom(response).map((user) => this.normalizeUser(user, source));

    return {
      items,
      total: this.totalFrom(response, items.length),
    };
  }

  private mergeUsers(directoryUsers: ManagedUser[], adminAccounts: ManagedUser[]): ManagedUser[] {
    const merged = new Map<string, ManagedUser>();

    for (const user of [...directoryUsers, ...adminAccounts]) {
      const key = this.userKey(user);
      const existing = merged.get(key);

      merged.set(key, existing ? { ...existing, ...user, source: user.source } : user);
    }

    return [...merged.values()].sort(
      (left, right) =>
        this.roleRank(left.role) - this.roleRank(right.role) ||
        this.displayName(left).localeCompare(this.displayName(right)),
    );
  }

  private normalizeUser(user: unknown, source: UserSource): ManagedUser {
    const record = user && typeof user === 'object' ? (user as Record<string, unknown>) : {};
    const email = this.stringFrom(record, ['email', 'mail', 'user_email']);
    const username = this.stringFrom(record, ['username', 'login', 'user_name']);
    const fullName = this.stringFrom(record, ['full_name', 'fullName', 'display_name', 'name']);

    return {
      id: this.stringFrom(record, ['id', '_id']),
      user_id: this.stringFrom(record, ['user_id', 'userId']),
      username,
      email: email || username,
      display_name: this.stringFrom(record, ['display_name', 'displayName']),
      full_name: fullName,
      photo_url: this.stringFrom(record, ['photo_url', 'photoUrl']),
      role: this.roleFrom(record),
      is_active: this.activeFrom(record),
      created_at: this.stringFrom(record, ['created_at', 'createdAt', 'created']),
      updated_at: this.stringFrom(record, ['updated_at', 'updatedAt', 'updated']),
      last_login_at: this.stringFrom(record, ['last_login_at', 'lastLoginAt', 'last_login']),
      source,
    };
  }

  private userKey(user: ManagedUser): string {
    return (user.email || this.userId(user)).toLowerCase();
  }

  private roleRank(role: AdminRole): number {
    return { super_admin: 0, admin: 1, user: 2 }[role];
  }

  private userArrayFrom(response: PaginatedResponse<AdminUser>): unknown[] {
    const record = response as unknown as Record<string, unknown>;
    const direct = this.arrayFrom(record, [
      'items',
      'admins',
      'users',
      'data',
      'results',
      'records',
    ]);

    if (direct.length > 0 || Array.isArray(record['items'])) {
      return direct;
    }

    const nestedData = record['data'];

    if (nestedData && typeof nestedData === 'object') {
      return this.arrayFrom(nestedData as Record<string, unknown>, [
        'items',
        'admins',
        'users',
        'results',
        'records',
      ]);
    }

    return [];
  }

  private arrayFrom(record: Record<string, unknown>, keys: string[]): unknown[] {
    for (const key of keys) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  }

  private totalFrom(response: PaginatedResponse<AdminUser>, fallback: number): number {
    const record = response as unknown as Record<string, unknown>;
    const directTotal = this.numberFrom(record, ['total', 'count', 'total_count', 'totalCount']);

    if (directTotal !== null) {
      return directTotal;
    }

    const nestedData = record['data'];

    if (nestedData && typeof nestedData === 'object') {
      const nestedTotal = this.numberFrom(nestedData as Record<string, unknown>, [
        'total',
        'count',
        'total_count',
        'totalCount',
      ]);

      if (nestedTotal !== null) {
        return nestedTotal;
      }
    }

    return fallback;
  }

  private roleFrom(record: Record<string, unknown>): AdminRole {
    const role = this.normalizedRole(
      this.stringFrom(record, [
        'role',
        'admin_role',
        'dashboard_role',
        'role_name',
        'roleName',
        'type',
      ]),
    );

    if (role) {
      return role;
    }

    const roles = record['roles'];

    if (Array.isArray(roles)) {
      for (const value of roles) {
        const normalized = this.normalizedRole(String(value));

        if (normalized) {
          return normalized;
        }
      }
    }

    if (this.booleanFrom(record, ['is_super_admin', 'isSuperAdmin', 'super_admin'])) {
      return 'super_admin';
    }

    if (this.booleanFrom(record, ['is_admin', 'isAdmin', 'admin'])) {
      return 'admin';
    }

    return 'user';
  }

  private normalizedRole(value: string): AdminRole | null {
    const role = value
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    if (role === 'super_admin' || role === 'superadmin' || role === 'owner') {
      return 'super_admin';
    }

    if (role === 'admin' || role === 'administrator') {
      return 'admin';
    }

    if (role === 'user' || role === 'employee' || role === 'employe') {
      return 'user';
    }

    return null;
  }

  private booleanFrom(record: Record<string, unknown>, keys: string[]): boolean {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        return ['true', '1', 'yes'].includes(value.toLowerCase());
      }
    }

    return false;
  }

  private usersFallback(error: unknown, endpointErrors: string[]) {
    endpointErrors.push(this.errorMessage(error, this.copy().errors.load));

    return of(null);
  }

  private activeFrom(record: Record<string, unknown>): boolean {
    const value =
      record['is_active'] ?? record['isActive'] ?? record['active'] ?? record['enabled'];

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return !['false', 'inactive', 'disabled', '0'].includes(value.toLowerCase());
    }

    return true;
  }

  private stringFrom(record: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.trim()) {
        return value;
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    return '';
  }

  private numberFrom(record: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }

    return null;
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (isNetworkError(error)) {
      return this.copy().errors.network;
    }

    return backendErrorMessage(error, fallback);
  }
}
