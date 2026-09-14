import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideActivity,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleAlert,
  LucideClock,
  LucideEye,
  LucideRefreshCw,
  LucideSearch,
  LucideShieldCheck,
  LucideUserCog,
  LucideX,
} from '@lucide/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  AdminRole,
  AdminUsageAction,
  AdminUsageAdmin,
  AdminUsageOverview,
  PaginatedResponse,
} from '../../core/models/backend-api.model';
import { ApiService } from '../../core/services/api.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { backendErrorMessage, isNetworkError } from '../../core/utils/api-error.util';

type ActionFilter = 'all' | 'login' | 'create' | 'update' | 'delete' | 'health';
type StatusFilter = 'all' | 'success' | 'failed';
type UsageMetricTone = 'blue' | 'green' | 'amber' | 'red';

interface UsageMetric {
  label: string;
  value: string;
  tone: UsageMetricTone;
  icon: 'activity' | 'login' | 'changes' | 'health';
}

const PAGE_SIZE = 20;

const COPY = {
  en: {
    eyebrow: 'Supervision',
    title: 'Admin usage',
    body: 'Trace sign-ins, settings changes, deletions, health checks, and every sensitive action made from the admin workspace.',
    from: 'From',
    to: 'To',
    refresh: 'Refresh',
    search: 'Search actions, admins, resources',
    action: 'Action',
    status: 'Status',
    admin: 'Admin',
    all: 'All',
    successful: 'Successful',
    failed: 'Failed',
    traceTitle: 'Action trace',
    adminsTitle: 'Admins',
    selectedTitle: 'Selected admin',
    overviewTitle: 'Usage analytics',
    noAdminSelected: 'Choose an admin to inspect their activity.',
    loading: 'Loading usage data',
    loadingDetail: 'Loading action details',
    emptyTitle: 'No actions found',
    emptyBody: 'Try changing the period, filters, or search term.',
    range: 'Showing',
    of: 'of',
    previous: 'Previous page',
    next: 'Next page',
    view: 'View',
    close: 'Close',
    noData: 'No data',
    table: {
      admin: 'Admin',
      action: 'Action',
      resource: 'Resource',
      status: 'Status',
      date: 'Date',
      details: 'Details',
    },
    metrics: {
      actions: 'Total actions',
      activeAdmins: 'Active admins',
      logins: 'Logins',
      changes: 'Changes',
      deletes: 'Deletes',
      health: 'Health checks',
      failed: 'Failed actions',
    },
    details: {
      title: 'Action details',
      actor: 'Actor',
      resource: 'Resource',
      request: 'Request',
      ip: 'IP address',
      metadata: 'Metadata',
    },
    roles: {
      super_admin: 'Super admin',
      admin: 'Admin',
      user: 'User',
    },
    errors: {
      load: 'Unable to load admin usage from the API.',
      detail: 'Unable to load action details.',
      network: 'Admin API is unreachable. Check backend URL, proxy, and network.',
    },
    partial: 'Some usage sections are unavailable. Visible cards are using the data that loaded.',
  },
  fr: {
    eyebrow: 'Supervision',
    title: 'Usage admin',
    body: "Tracez les connexions, changements, suppressions, controles sante et toutes les actions sensibles de l'espace admin.",
    from: 'De',
    to: 'A',
    refresh: 'Actualiser',
    search: 'Rechercher actions, admins, ressources',
    action: 'Action',
    status: 'Statut',
    admin: 'Admin',
    all: 'Tous',
    successful: 'Reussi',
    failed: 'Echoue',
    traceTitle: 'Trace actions',
    adminsTitle: 'Admins',
    selectedTitle: 'Admin selectionne',
    overviewTitle: 'Analytics usage',
    noAdminSelected: 'Choisissez un admin pour inspecter son activite.',
    loading: 'Chargement usage',
    loadingDetail: 'Chargement details action',
    emptyTitle: 'Aucune action',
    emptyBody: 'Changez la periode, les filtres ou la recherche.',
    range: 'Affichage',
    of: 'sur',
    previous: 'Page precedente',
    next: 'Page suivante',
    view: 'Voir',
    close: 'Fermer',
    noData: 'Aucune donnee',
    table: {
      admin: 'Admin',
      action: 'Action',
      resource: 'Ressource',
      status: 'Statut',
      date: 'Date',
      details: 'Details',
    },
    metrics: {
      actions: 'Actions totales',
      activeAdmins: 'Admins actifs',
      logins: 'Connexions',
      changes: 'Modifications',
      deletes: 'Suppressions',
      health: 'Controles sante',
      failed: 'Actions echouees',
    },
    details: {
      title: 'Details action',
      actor: 'Acteur',
      resource: 'Ressource',
      request: 'Requete',
      ip: 'Adresse IP',
      metadata: 'Metadata',
    },
    roles: {
      super_admin: 'Super admin',
      admin: 'Admin',
      user: 'User',
    },
    errors: {
      load: "Impossible de charger l'usage admin depuis l'API.",
      detail: 'Impossible de charger les details action.',
      network: "API admin inaccessible. Verifiez l'URL backend, le proxy et le reseau.",
    },
    partial:
      'Certaines sections usage sont indisponibles. Les cartes visibles utilisent les donnees chargees.',
  },
};

@Component({
  selector: 'app-admin-usage-page',
  imports: [
    LucideActivity,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleAlert,
    LucideClock,
    LucideEye,
    LucideRefreshCw,
    LucideSearch,
    LucideShieldCheck,
    LucideUserCog,
    LucideX,
  ],
  templateUrl: './admin-usage-page.component.html',
  styleUrl: './admin-usage-page.component.scss',
})
export class AdminUsagePageComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly preferences = inject(PreferencesService);
  private searchDebounce?: ReturnType<typeof setTimeout>;

  protected readonly copy = computed(() => COPY[this.preferences.language()]);
  protected readonly dateFrom = signal(this.defaultDateFrom());
  protected readonly dateTo = signal(this.formatInputDate(new Date()));
  protected readonly searchTerm = signal('');
  protected readonly actionFilter = signal<ActionFilter>('all');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly selectedAdminId = signal('all');
  protected readonly overview = signal<AdminUsageOverview | null>(null);
  protected readonly selectedAdminOverview = signal<AdminUsageOverview | null>(null);
  protected readonly actions = signal<AdminUsageAction[]>([]);
  protected readonly admins = signal<AdminUsageAdmin[]>([]);
  protected readonly total = signal(0);
  protected readonly offset = signal(0);
  protected readonly loading = signal(false);
  protected readonly loadingDetail = signal(false);
  protected readonly error = signal('');
  protected readonly warning = signal('');
  protected readonly selectedAction = signal<AdminUsageAction | null>(null);

  protected readonly actionOptions: ActionFilter[] = [
    'all',
    'login',
    'create',
    'update',
    'delete',
    'health',
  ];
  protected readonly statusOptions: StatusFilter[] = ['all', 'success', 'failed'];

  protected readonly metrics = computed<UsageMetric[]>(() => [
    {
      label: this.copy().metrics.actions,
      value: this.formatNumber(this.totalActionCount()),
      tone: 'blue',
      icon: 'activity',
    },
    {
      label: this.copy().metrics.activeAdmins,
      value: this.formatNumber(this.activeAdminCount()),
      tone: 'blue',
      icon: 'login',
    },
    {
      label: this.copy().metrics.logins,
      value: this.formatNumber(this.loginCount()),
      tone: 'green',
      icon: 'login',
    },
    {
      label: this.copy().metrics.changes,
      value: this.formatNumber(this.changeCount()),
      tone: 'amber',
      icon: 'changes',
    },
    {
      label: this.copy().metrics.deletes,
      value: this.formatNumber(this.deleteCount()),
      tone: 'red',
      icon: 'changes',
    },
    {
      label: this.copy().metrics.health,
      value: this.formatNumber(this.healthCheckCount()),
      tone: 'green',
      icon: 'health',
    },
    {
      label: this.copy().metrics.failed,
      value: this.formatNumber(this.failedActionCount()),
      tone: 'red',
      icon: 'activity',
    },
  ]);

  protected readonly selectedAdmin = computed(() =>
    this.admins().find((admin) => this.adminId(admin) === this.selectedAdminId()),
  );

  protected readonly pageStart = computed(() =>
    this.total() === 0 && this.actions().length === 0 ? 0 : this.offset() + 1,
  );
  protected readonly pageEnd = computed(() =>
    Math.min(this.offset() + this.actions().length, this.total() || this.actions().length),
  );
  protected readonly canGoPrevious = computed(() => this.offset() > 0 && !this.loading());
  protected readonly canGoNext = computed(
    () => this.offset() + PAGE_SIZE < this.total() && !this.loading(),
  );

  ngOnInit(): void {
    this.loadUsage();
  }

  ngOnDestroy(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  protected loadUsage(): void {
    const filters = this.baseFilters();
    const endpointErrors: string[] = [];

    this.loading.set(true);
    this.error.set('');
    this.warning.set('');

    forkJoin({
      overview: this.apiService
        .getAdminUsageOverview(filters)
        .pipe(catchError((error: unknown) => this.endpointFallback(error, endpointErrors))),
      actions: this.apiService
        .listAdminUsageActions({
          ...filters,
          ...this.actionFilters(),
          limit: PAGE_SIZE,
          offset: this.offset(),
        })
        .pipe(catchError((error: unknown) => this.endpointFallback(error, endpointErrors))),
      admins: this.apiService
        .listAdminUsageAdmins({ search: this.searchTerm().trim(), limit: 100, offset: 0 })
        .pipe(catchError((error: unknown) => this.endpointFallback(error, endpointErrors))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(({ overview, actions, admins }) => {
        const normalizedActions = this.normalizeActionsResponse(
          actions as PaginatedResponse<AdminUsageAction> | null,
        );
        const normalizedAdmins = this.normalizeAdminsResponse(
          admins as PaginatedResponse<AdminUsageAdmin> | null,
        );

        this.overview.set(this.normalizeOverview(overview));
        this.actions.set(normalizedActions.items);
        this.total.set(normalizedActions.total);
        this.admins.set(normalizedAdmins.items);

        if (!overview && !actions && !admins) {
          this.error.set(endpointErrors[0] ?? this.copy().errors.load);
        } else if (endpointErrors.length > 0) {
          this.warning.set(this.copy().partial);
        }

        this.loadSelectedAdminOverview();
      });
  }

  protected updateDateFrom(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }

  protected updateDateTo(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);

    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }

    this.searchDebounce = setTimeout(() => {
      this.offset.set(0);
      this.loadUsage();
    }, 260);
  }

  protected updateActionFilter(event: Event): void {
    this.actionFilter.set((event.target as HTMLSelectElement).value as ActionFilter);
    this.offset.set(0);
    this.loadUsage();
  }

  protected updateStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
    this.offset.set(0);
    this.loadUsage();
  }

  protected updateAdminFilter(event: Event): void {
    this.selectedAdminId.set((event.target as HTMLSelectElement).value);
    this.offset.set(0);
    this.selectedAdminOverview.set(null);
    this.loadUsage();
  }

  protected selectAdmin(admin: AdminUsageAdmin): void {
    this.selectedAdminId.set(this.adminId(admin));
    this.offset.set(0);
    this.selectedAdminOverview.set(null);
    this.loadUsage();
  }

  protected previousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.offset.update((offset) => Math.max(0, offset - PAGE_SIZE));
    this.loadUsage();
  }

  protected nextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.offset.update((offset) => offset + PAGE_SIZE);
    this.loadUsage();
  }

  protected openAction(action: AdminUsageAction): void {
    const id = this.actionId(action);

    this.selectedAction.set(action);

    if (!id) {
      return;
    }

    this.loadingDetail.set(true);
    this.apiService
      .getAdminUsageAction(id)
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: (detail) => this.selectedAction.set(this.normalizeAction(detail)),
        error: () => this.error.set(this.copy().errors.detail),
      });
  }

  protected closeAction(): void {
    this.selectedAction.set(null);
  }

  protected adminId(admin: AdminUsageAdmin): string {
    return admin.id ?? admin.user_id ?? admin.username ?? admin.email;
  }

  protected adminName(admin: AdminUsageAdmin): string {
    return (
      admin.display_name ||
      admin.full_name ||
      admin.name ||
      admin.username ||
      admin.email ||
      this.copy().noData
    );
  }

  protected actionId(action: AdminUsageAction): string {
    return action.id || String(action['log_id'] ?? action['audit_id'] ?? '');
  }

  protected actionActor(action: AdminUsageAction): string {
    const admin = this.adminForAction(action);

    if (admin) {
      return this.adminName(admin);
    }

    return (
      action.admin_name ||
      this.stringFrom(action, ['display_name', 'full_name', 'name', 'username']) ||
      this.nameFromEmail(action.actor_email || action.admin_email) ||
      String(action.actor_user_id ?? '') ||
      this.copy().noData
    );
  }

  protected actionResource(action: AdminUsageAction): string {
    const type = action.resource_type || this.stringFrom(action, ['entity_type', 'module']);
    const id = action.resource_id || this.stringFrom(action, ['entity_id', 'target_id']);

    return [type, id].filter(Boolean).join(' / ') || this.copy().noData;
  }

  protected actionSummary(action: AdminUsageAction): string {
    return action.summary || action.action || this.copy().noData;
  }

  protected actionStatus(action: AdminUsageAction): string {
    return action.status || this.copy().successful;
  }

  protected roleLabel(role?: AdminRole): string {
    return role ? this.copy().roles[role] : this.copy().noData;
  }

  protected adminActions(admin: AdminUsageAdmin): string {
    return this.formatNumber(
      this.numberFrom(admin, ['actions_count', 'total_actions', 'actions', 'usage_total']),
    );
  }

  protected adminInitials(admin: AdminUsageAdmin): string {
    const initials = this.adminName(admin)
      .split(/[.\s@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    return initials || 'AD';
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
      timeStyle: 'short',
    }).format(date);
  }

  protected selectedAdminMetric(path: string[]): string {
    return this.formatNumber(this.numberFrom(this.selectedAdminOverview(), path));
  }

  protected metadataText(action: AdminUsageAction | null): string {
    if (!action?.metadata) {
      return this.copy().noData;
    }

    return JSON.stringify(action.metadata, null, 2);
  }

  private adminForAction(action: AdminUsageAction): AdminUsageAdmin | undefined {
    const actionAdminId = action.admin_id || action.actor_user_id;
    const actionEmail = action.admin_email || action.actor_email;

    return this.admins().find((admin) => {
      const adminId = this.adminId(admin);

      return Boolean(
        (actionAdminId && adminId === actionAdminId) ||
        (actionEmail && admin.email.toLowerCase() === actionEmail.toLowerCase()),
      );
    });
  }

  private nameFromEmail(email?: string): string {
    if (!email) {
      return '';
    }

    return (
      email
        .split('@')[0]
        ?.replace(/[._-]+/g, ' ')
        .trim() ?? ''
    );
  }

  private loadSelectedAdminOverview(): void {
    const adminId = this.selectedAdminId();

    if (adminId === 'all') {
      this.selectedAdminOverview.set(null);
      return;
    }

    this.apiService.getAdminUsageAdminOverview(adminId, this.baseFilters()).subscribe({
      next: (overview) => this.selectedAdminOverview.set(this.normalizeOverview(overview)),
      error: () => this.selectedAdminOverview.set(null),
    });
  }

  private baseFilters(): Record<string, string> {
    return {
      date_from: this.dateFrom(),
      date_to: this.dateTo(),
    };
  }

  private actionFilters(): Record<string, string> {
    const filters: Record<string, string> = {};
    const search = this.searchTerm().trim();

    if (search) {
      filters['search'] = search;
    }

    if (this.actionFilter() !== 'all') {
      filters['action'] = this.actionFilter();
    }

    if (this.statusFilter() !== 'all') {
      filters['status'] = this.statusFilter();
    }

    if (this.selectedAdminId() !== 'all') {
      filters['admin_id'] = this.selectedAdminId();
    }

    return filters;
  }

  private normalizeActionsResponse(response: PaginatedResponse<AdminUsageAction> | null): {
    items: AdminUsageAction[];
    total: number;
  } {
    if (!response) {
      return { items: [], total: 0 };
    }

    const items = this.collectionFrom(response, [
      'items',
      'actions',
      'logs',
      'data',
      'results',
      'records',
    ]).map((item) => this.normalizeAction(item));

    return {
      items,
      total: this.totalFrom(response, items.length),
    };
  }

  private normalizeAdminsResponse(response: PaginatedResponse<AdminUsageAdmin> | null): {
    items: AdminUsageAdmin[];
    total: number;
  } {
    if (!response) {
      return { items: [], total: 0 };
    }

    const items = this.collectionFrom(response, [
      'items',
      'admins',
      'users',
      'data',
      'results',
      'records',
    ]).map((item) => this.normalizeAdmin(item));

    return {
      items,
      total: this.totalFrom(response, items.length),
    };
  }

  private normalizeOverview(source: unknown): AdminUsageOverview | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const record = source as Record<string, unknown>;

    for (const key of ['overview', 'stats', 'analytics', 'data']) {
      const value = record[key];

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as AdminUsageOverview;
      }
    }

    return record as AdminUsageOverview;
  }

  private normalizeAction(source: unknown): AdminUsageAction {
    const record = source && typeof source === 'object' ? (source as Record<string, unknown>) : {};

    return {
      ...record,
      id: this.stringFrom(record, ['id', 'log_id', 'audit_id']),
      action: this.stringFrom(record, ['action', 'event', 'type']) || 'action',
      actor_email: this.stringFrom(record, ['actor_email', 'admin_email', 'email']),
      actor_user_id: this.stringFrom(record, ['actor_user_id', 'admin_id', 'user_id']),
      actor_role: this.stringFrom(record, ['actor_role', 'role']),
      admin_id: this.stringFrom(record, ['admin_id', 'actor_user_id', 'user_id']),
      admin_email: this.stringFrom(record, ['admin_email', 'actor_email', 'email']),
      admin_name: this.stringFrom(record, ['admin_name', 'display_name', 'full_name', 'name']),
      resource_type: this.stringFrom(record, ['resource_type', 'entity_type', 'module']),
      resource_id: this.stringFrom(record, ['resource_id', 'entity_id', 'target_id']),
      status: this.stringFrom(record, ['status']) || 'success',
      summary: this.stringFrom(record, ['summary', 'message', 'description']),
      ip_address: this.stringFrom(record, ['ip_address', 'ip']),
      user_agent: this.stringFrom(record, ['user_agent']),
      request_method: this.stringFrom(record, ['request_method', 'method']),
      request_path: this.stringFrom(record, ['request_path', 'path', 'url']),
      metadata:
        record['metadata'] && typeof record['metadata'] === 'object'
          ? (record['metadata'] as Record<string, unknown>)
          : undefined,
      created_at:
        this.stringFrom(record, ['created_at', 'createdAt', 'timestamp', 'logged_at']) ||
        new Date().toISOString(),
    };
  }

  private normalizeAdmin(source: unknown): AdminUsageAdmin {
    const record = source && typeof source === 'object' ? (source as Record<string, unknown>) : {};
    const username = this.stringFrom(record, ['username', 'login', 'user_name']);
    const email = this.stringFrom(record, ['email', 'admin_email', 'mail']) || username;

    return {
      ...record,
      id: this.stringFrom(record, ['id', 'admin_id', '_id']),
      user_id: this.stringFrom(record, ['user_id', 'admin_user_id']),
      username,
      email,
      display_name: this.stringFrom(record, ['display_name', 'displayName']),
      full_name: this.stringFrom(record, ['full_name', 'fullName', 'name']),
      name: this.stringFrom(record, ['name']),
      role: this.roleFrom(record),
      is_active: this.activeFrom(record),
      actions_count: this.numberFrom(record, [
        'actions_count',
        'total_actions',
        'actions',
        'usage_total',
      ]),
      last_login_at: this.stringFrom(record, ['last_login_at', 'lastLoginAt', 'last_login']),
      created_at: this.stringFrom(record, ['created_at', 'createdAt', 'created']),
      updated_at: this.stringFrom(record, ['updated_at', 'updatedAt', 'updated']),
    };
  }

  private collectionFrom(source: unknown, keys: string[]): unknown[] {
    if (Array.isArray(source)) {
      return source;
    }

    if (!source || typeof source !== 'object') {
      return [];
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value;
      }

      if (value && typeof value === 'object') {
        const nested = this.collectionFrom(value, ['items', 'actions', 'logs', 'admins', 'users']);

        if (nested.length > 0) {
          return nested;
        }
      }
    }

    return [];
  }

  private totalFrom(source: unknown, fallback: number): number {
    return (
      this.firstNumber(source, ['total', 'count', 'total_count', 'totalCount']) ??
      this.firstNumber(this.valueAt(source, 'data'), ['total', 'count', 'total_count']) ??
      fallback
    );
  }

  private roleFrom(record: Record<string, unknown>): AdminRole {
    const role = this.stringFrom(record, ['role']);

    return ['super_admin', 'admin', 'user'].includes(role) ? (role as AdminRole) : 'admin';
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

  private totalActionCount(): number {
    return Math.max(
      this.numberFrom(this.overview(), [
        'total_actions',
        'actions_total',
        'actions.count',
        'actions.total',
        'totals.actions',
        'totals.total_actions',
        'summary.actions',
        'summary.total_actions',
      ]),
      this.total(),
      this.actions().length,
    );
  }

  private activeAdminCount(): number {
    return Math.max(
      this.numberFrom(this.overview(), [
        'active_admins',
        'active_admin_count',
        'admins.active',
        'admins.active_admins',
        'admins.active_count',
        'admin_users.active',
        'totals.active_admins',
        'summary.active_admins',
      ]),
      this.admins().filter((admin) => admin.is_active).length,
    );
  }

  private loginCount(): number {
    return Math.max(
      this.numberFrom(this.overview(), [
        'login_count',
        'logins',
        'login.total',
        'actions.login',
        'by_action.login',
        'totals.login_count',
        'totals.logins',
        'summary.login_count',
        'summary.logins',
      ]),
      this.countActions(['login', 'log_in', 'signin', 'sign_in', 'auth']),
    );
  }

  private changeCount(): number {
    return Math.max(
      this.numberFrom(this.overview(), [
        'change_count',
        'changes',
        'write_count',
        'totals.changes',
        'summary.changes',
      ]) +
        this.numberFrom(this.overview(), [
          'create_count',
          'created_count',
          'actions.create',
          'by_action.create',
          'totals.create_count',
          'summary.create_count',
        ]) +
        this.numberFrom(this.overview(), [
          'update_count',
          'updated_count',
          'modify_count',
          'actions.update',
          'by_action.update',
          'totals.update_count',
          'summary.update_count',
        ]),
      this.countActions(['create', 'update', 'patch', 'edit', 'modify']),
    );
  }

  private deleteCount(): number {
    return Math.max(
      this.numberFrom(this.overview(), [
        'delete_count',
        'deleted_count',
        'deletes',
        'actions.delete',
        'by_action.delete',
        'totals.delete_count',
        'totals.deletes',
        'summary.delete_count',
        'summary.deletes',
      ]),
      this.countActions(['delete', 'remove']),
    );
  }

  private healthCheckCount(): number {
    return Math.max(
      this.numberFrom(this.overview(), [
        'health_check_count',
        'health_checks',
        'health.total',
        'actions.health',
        'actions.health_check',
        'by_action.health',
        'by_action.health_check',
        'totals.health_check_count',
        'totals.health_checks',
        'summary.health_check_count',
        'summary.health_checks',
      ]),
      this.countActions(['health']),
    );
  }

  private failedActionCount(): number {
    return Math.max(
      this.numberFrom(this.overview(), [
        'failed_actions',
        'failed',
        'failure_count',
        'errors',
        'actions.failed',
        'by_status.failed',
        'by_status.error',
        'totals.failed_actions',
        'summary.failed_actions',
      ]),
      this.actions().filter((action) =>
        ['failed', 'failure', 'error'].includes(this.actionStatus(action).toLowerCase()),
      ).length,
    );
  }

  private countActions(matchers: string[]): number {
    return this.actions().filter((action) => {
      const value = `${action.action} ${action.summary ?? ''} ${action.resource_type ?? ''}`
        .toLowerCase()
        .replace(/[-\s]/g, '_');

      return matchers.some((matcher) => value.includes(matcher));
    }).length;
  }

  private numberFrom(source: unknown, paths: string[]): number {
    return this.firstNumber(source, paths) ?? 0;
  }

  private firstNumber(source: unknown, paths: string[]): number | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    for (const path of paths) {
      const value = this.valueAt(source, path);

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }

    return null;
  }

  private stringFrom(source: unknown, keys: string[]): string {
    if (!source || typeof source !== 'object') {
      return '';
    }

    for (const key of keys) {
      const value = this.valueAt(source, key);

      if (typeof value === 'string' && value.trim()) {
        return value;
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    return '';
  }

  private valueAt(source: unknown, path: string): unknown {
    if (!source || typeof source !== 'object') {
      return undefined;
    }

    return path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, source);
  }

  private endpointFallback(error: unknown, endpointErrors: string[]) {
    endpointErrors.push(this.errorMessage(error));

    return of(null);
  }

  private errorMessage(error: unknown): string {
    if (isNetworkError(error)) {
      return this.copy().errors.network;
    }

    return backendErrorMessage(error, this.copy().errors.load);
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat(this.preferences.language() === 'fr' ? 'fr-FR' : 'en-US').format(
      value,
    );
  }

  private defaultDateFrom(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);

    return this.formatInputDate(date);
  }

  private formatInputDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
