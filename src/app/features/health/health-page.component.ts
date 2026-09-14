import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideActivity,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideCircleOff,
  LucideClock,
  LucideDatabase,
  LucideGauge,
  LucideHistory,
  LucideMailCheck,
  LucideRefreshCw,
  LucideServer,
  LucideShieldCheck,
  LucideTimer,
  LucideTriangleAlert,
  LucideWifi,
  LucideWorkflow,
} from '@lucide/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  AdminHealth,
  AdminHealthService,
  AdminOverview,
  AdminUsageOverview,
  PlanningAnalyticsOverview,
} from '../../core/models/backend-api.model';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { backendErrorMessage, isNetworkError } from '../../core/utils/api-error.util';

type HealthStatus = 'healthy' | 'attention' | 'down';
type HealthIcon = 'api' | 'database' | 'auth' | 'planning' | 'mail' | 'audit';

const COPY = {
  en: {
    eyebrow: 'Platform health',
    title: 'System health',
    body: 'Monitor admin API availability, session state, planning workload, mail activity, and audit coverage.',
    refresh: 'Refresh',
    retry: 'Retry',
    loading: 'Checking platform health',
    lastChecked: 'Last checked',
    neverChecked: 'Not checked yet',
    responseTime: 'Response time',
    overall: 'Overall status',
    authenticated: 'Authenticated session',
    pendingReview: 'Pending review',
    activeUsers: 'Active users',
    unavailable: 'Unavailable',
    noData: 'No data',
    statuses: {
      healthy: 'Healthy',
      attention: 'Needs attention',
      down: 'Down',
    },
    errors: {
      load: 'Unable to read health signals from the admin API.',
      network: 'Admin API is unreachable. Check backend URL, proxy, and network.',
    },
    services: {
      api: {
        name: 'Backend API',
        healthy: 'Admin overview endpoint responded successfully.',
        attention: 'Waiting for the first health check.',
        down: 'The frontend cannot reach the admin API.',
      },
      database: {
        name: 'Database access',
        healthy: 'Overview data loaded through the backend data layer.',
        attention: 'Database state will appear after a successful overview call.',
        down: 'Database access cannot be confirmed while the API is unavailable.',
      },
      auth: {
        name: 'Admin session',
        healthy: 'Bearer token is present for protected admin routes.',
        attention: 'No local session token is available.',
        down: 'Authentication state could not be verified.',
      },
      planning: {
        name: 'Planning pipeline',
        healthy: 'Planning queue is within a normal review range.',
        attention: 'Review load is building up and should be watched.',
        down: 'Planning status cannot be evaluated.',
      },
      mail: {
        name: 'Mail activity',
        healthy: 'Sent draft totals are available from backend overview.',
        attention: 'No sent draft activity is reported yet.',
        down: 'Mail activity cannot be evaluated.',
      },
      audit: {
        name: 'Audit stream',
        healthy: 'Audit totals are available for compliance checks.',
        attention: 'No audit events are reported yet.',
        down: 'Audit stream cannot be evaluated.',
      },
    },
    panels: {
      services: 'Service checks',
      checks: 'Operational checks',
      snapshot: 'Backend snapshot',
    },
    checks: {
      api: 'Admin overview request',
      token: 'Bearer token in browser storage',
      queue: 'Review queue threshold',
      audit: 'Audit event availability',
    },
    snapshotLabels: {
      users: 'Total users',
      admins: 'Admins',
      imports: 'Planning imports',
      sent: 'Drafts sent',
      audits: 'Audit events',
    },
  },
  fr: {
    eyebrow: 'Sante plateforme',
    title: 'Sante systeme',
    body: "Surveillez l'API admin, la session, la charge planning, l'activite mail et la couverture audit.",
    refresh: 'Actualiser',
    retry: 'Reessayer',
    loading: 'Verification sante plateforme',
    lastChecked: 'Derniere verification',
    neverChecked: 'Pas encore verifie',
    responseTime: 'Temps reponse',
    overall: 'Etat global',
    authenticated: 'Session authentifiee',
    pendingReview: 'En revue',
    activeUsers: 'Users actifs',
    unavailable: 'Indisponible',
    noData: 'Aucune donnee',
    statuses: {
      healthy: 'Sain',
      attention: 'A surveiller',
      down: 'Indisponible',
    },
    errors: {
      load: "Impossible de lire les signaux sante depuis l'API admin.",
      network: "API admin inaccessible. Verifiez l'URL backend, le proxy et le reseau.",
    },
    services: {
      api: {
        name: 'API backend',
        healthy: "L'endpoint overview admin a repondu correctement.",
        attention: 'En attente de la premiere verification.',
        down: "Le frontend ne peut pas joindre l'API admin.",
      },
      database: {
        name: 'Acces database',
        healthy: 'Les donnees overview sont lues via la couche backend.',
        attention: 'Etat database visible apres un appel overview reussi.',
        down: "Acces database non confirme tant que l'API est indisponible.",
      },
      auth: {
        name: 'Session admin',
        healthy: 'Le token Bearer est present pour les routes admin protegees.',
        attention: 'Aucun token de session local disponible.',
        down: "L'etat d'authentification ne peut pas etre verifie.",
      },
      planning: {
        name: 'Pipeline planning',
        healthy: 'La file de revue reste dans une plage normale.',
        attention: 'La charge de revue monte et doit etre suivie.',
        down: 'Etat planning non evaluable.',
      },
      mail: {
        name: 'Activite mail',
        healthy: 'Le total des drafts envoyes est disponible depuis overview.',
        attention: 'Aucune activite de drafts envoyes signalee.',
        down: 'Activite mail non evaluable.',
      },
      audit: {
        name: 'Flux audit',
        healthy: 'Les totaux audit sont disponibles pour les controles.',
        attention: 'Aucun evenement audit signale.',
        down: 'Flux audit non evaluable.',
      },
    },
    panels: {
      services: 'Controles services',
      checks: 'Controles operationnels',
      snapshot: 'Snapshot backend',
    },
    checks: {
      api: 'Requete overview admin',
      token: 'Token Bearer en stockage navigateur',
      queue: 'Seuil file de revue',
      audit: 'Disponibilite evenements audit',
    },
    snapshotLabels: {
      users: 'Total users',
      admins: 'Admins',
      imports: 'Imports planning',
      sent: 'Drafts envoyes',
      audits: 'Evenements audit',
    },
  },
};

@Component({
  selector: 'app-health-page',
  imports: [
    LucideActivity,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideCircleOff,
    LucideClock,
    LucideDatabase,
    LucideGauge,
    LucideHistory,
    LucideMailCheck,
    LucideRefreshCw,
    LucideServer,
    LucideShieldCheck,
    LucideTimer,
    LucideTriangleAlert,
    LucideWifi,
    LucideWorkflow,
  ],
  templateUrl: './health-page.component.html',
  styleUrl: './health-page.component.scss',
})
export class HealthPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly preferences = inject(PreferencesService);

  protected readonly copy = computed(() => COPY[this.preferences.language()]);
  protected readonly health = signal<AdminHealth | null>(null);
  protected readonly overview = signal<AdminOverview | null>(null);
  protected readonly planningOverview = signal<PlanningAnalyticsOverview | null>(null);
  protected readonly usageOverview = signal<AdminUsageOverview | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly latencyMs = signal<number | null>(null);
  protected readonly checkedAt = signal<Date | null>(null);
  private readonly adminDirectory = signal<unknown[]>([]);
  private readonly userDirectory = signal<unknown[]>([]);
  private readonly adminDirectoryTotal = signal<number | null>(null);
  private readonly userDirectoryTotal = signal<number | null>(null);
  private readonly planningImportsCount = signal<number | null>(null);
  private readonly sendHistoryCount = signal<number | null>(null);
  private readonly auditEventsCount = signal<number | null>(null);

  protected readonly overallStatus = computed<HealthStatus>(() => {
    if (this.error()) {
      return 'down';
    }

    const health = this.health();

    if (!health) {
      return 'attention';
    }

    return this.statusFromBackend(health.status);
  });

  protected readonly summaryCards = computed(() => {
    const latencyMs = this.latencyMs();
    const pending = this.pendingReviews();

    return [
      {
        label: this.copy().overall,
        value: this.statusLabel(this.overallStatus()),
        detail: this.formatCheckedAt(),
        status: this.overallStatus(),
        icon: 'overall',
      },
      {
        label: this.copy().responseTime,
        value: latencyMs === null ? '-' : `${latencyMs} ms`,
        detail: this.error() ? this.copy().unavailable : this.copy().lastChecked,
        status: this.error()
          ? 'down'
          : latencyMs !== null && latencyMs > 1200
            ? 'attention'
            : 'healthy',
        icon: 'latency',
      },
      {
        label: this.copy().pendingReview,
        value: this.formatNumber(pending),
        detail: pending > 40 ? this.copy().statuses.attention : this.copy().statuses.healthy,
        status: pending > 40 ? 'attention' : 'healthy',
        icon: 'queue',
      },
      {
        label: this.copy().activeUsers,
        value: this.formatNumber(this.activeUsers()),
        detail: this.copy().authenticated,
        status: this.authService.isAuthenticated() ? 'healthy' : 'attention',
        icon: 'users',
      },
    ];
  });

  protected readonly services = computed(() => {
    const backendServices = this.health()?.services ?? [];

    if (backendServices.length > 0) {
      return backendServices.map((service) => this.backendService(service));
    }

    const hasHealth = Boolean(this.health() && !this.error());
    const pending = this.pendingReviews();
    const sent = this.draftsSent() ?? 0;
    const audits = this.auditEvents() ?? 0;

    return [
      this.service('api', hasHealth ? 'healthy' : this.error() ? 'down' : 'attention', {
        metric: this.latencyMs() === null ? '-' : `${this.latencyMs()} ms`,
      }),
      this.service('database', hasHealth ? 'healthy' : this.error() ? 'down' : 'attention', {
        metric: hasHealth ? this.copy().statuses.healthy : this.copy().noData,
      }),
      this.service('auth', this.authService.isAuthenticated() ? 'healthy' : 'attention', {
        metric: this.authService.isAuthenticated() ? 'Bearer' : this.copy().noData,
      }),
      this.service('planning', hasHealth ? (pending > 40 ? 'attention' : 'healthy') : 'down', {
        metric: `${this.formatNumber(pending)} ${this.copy().pendingReview.toLowerCase()}`,
      }),
      this.service('mail', hasHealth ? (sent > 0 ? 'healthy' : 'attention') : 'down', {
        metric: this.formatNumber(sent),
      }),
      this.service('audit', hasHealth ? (audits > 0 ? 'healthy' : 'attention') : 'down', {
        metric: this.formatNumber(audits),
      }),
    ];
  });

  protected readonly checks = computed(() => [
    {
      label: this.copy().checks.api,
      status: this.error() ? 'down' : this.health() ? this.overallStatus() : 'attention',
    },
    {
      label: this.copy().checks.token,
      status: this.authService.isAuthenticated() ? 'healthy' : 'attention',
    },
    {
      label: this.copy().checks.queue,
      status: this.pendingReviews() > 40 ? 'attention' : 'healthy',
    },
    {
      label: this.copy().checks.audit,
      status: this.serviceStatus('audit') ?? 'attention',
    },
  ]);

  protected readonly snapshot = computed(() => {
    return [
      { label: this.copy().snapshotLabels.users, value: this.formatNumber(this.totalUsers()) },
      {
        label: this.copy().snapshotLabels.admins,
        value: this.formatNumber(this.adminUsers()),
      },
      {
        label: this.copy().snapshotLabels.imports,
        value: this.formatNumber(this.planningImports()),
      },
      { label: this.copy().snapshotLabels.sent, value: this.formatNumber(this.draftsSent()) },
      {
        label: this.copy().snapshotLabels.audits,
        value: this.formatNumber(this.auditEvents()),
      },
    ];
  });

  ngOnInit(): void {
    this.loadHealth();
  }

  protected loadHealth(): void {
    const startedAt = performance.now();
    const endpointErrors: string[] = [];

    this.loading.set(true);
    this.error.set('');

    forkJoin({
      health: this.apiService
        .getAdminHealth()
        .pipe(catchError((error: unknown) => this.healthFallback(error, endpointErrors))),
      overview: this.apiService.getOverview().pipe(catchError(() => of(null))),
      planningOverview: this.apiService
        .getPlanningAnalyticsOverview()
        .pipe(catchError(() => of(null))),
      usageOverview: this.apiService.getAdminUsageOverview().pipe(catchError(() => of(null))),
      adminAccounts: this.apiService
        .listAdminAccounts({ limit: 200, offset: 0 })
        .pipe(catchError(() => of(null))),
      directoryUsers: this.apiService
        .listUsers({ limit: 200, offset: 0 })
        .pipe(catchError(() => of(null))),
      planningImports: this.apiService
        .listPlanningImports({ limit: 1, offset: 0 })
        .pipe(catchError(() => of(null))),
      sendHistory: this.apiService
        .listSendHistory({ limit: 1, offset: 0 })
        .pipe(catchError(() => of(null))),
      auditLogs: this.apiService
        .listAuditLogs({ limit: 1, offset: 0 })
        .pipe(catchError(() => of(null))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({
          health,
          overview,
          planningOverview,
          usageOverview,
          adminAccounts,
          directoryUsers,
          planningImports,
          sendHistory,
          auditLogs,
        }) => {
          const normalizedHealth = this.normalizeHealth(health);

          this.health.set(normalizedHealth);
          this.overview.set(this.normalizeAdminOverview(overview));
          this.planningOverview.set(this.normalizePlanningOverview(planningOverview));
          this.usageOverview.set(this.normalizeUsageOverview(usageOverview));
          this.adminDirectory.set(
            this.collectionFrom(adminAccounts, [
              'items',
              'admins',
              'users',
              'data',
              'results',
              'records',
            ]),
          );
          this.userDirectory.set(
            this.collectionFrom(directoryUsers, ['items', 'users', 'data', 'results', 'records']),
          );
          this.adminDirectoryTotal.set(this.totalFromResponse(adminAccounts));
          this.userDirectoryTotal.set(this.totalFromResponse(directoryUsers));
          this.planningImportsCount.set(this.totalFromResponse(planningImports));
          this.sendHistoryCount.set(this.totalFromResponse(sendHistory));
          this.auditEventsCount.set(this.totalFromResponse(auditLogs));
          this.latencyMs.set(
            normalizedHealth?.latency_ms ?? Math.round(performance.now() - startedAt),
          );
          this.checkedAt.set(new Date());

          if (!normalizedHealth) {
            this.error.set(endpointErrors[0] ?? this.copy().errors.load);
          }
        },
        error: (error: unknown) => {
          this.health.set(null);
          this.overview.set(null);
          this.planningOverview.set(null);
          this.usageOverview.set(null);
          this.adminDirectory.set([]);
          this.userDirectory.set([]);
          this.adminDirectoryTotal.set(null);
          this.userDirectoryTotal.set(null);
          this.planningImportsCount.set(null);
          this.sendHistoryCount.set(null);
          this.auditEventsCount.set(null);
          this.latencyMs.set(null);
          this.checkedAt.set(new Date());
          this.error.set(this.errorMessage(error));
        },
      });
  }

  protected statusLabel(status: HealthStatus): string {
    return this.copy().statuses[status];
  }

  protected formatCheckedAt(): string {
    const checkedAt = this.checkedAt();

    if (!checkedAt) {
      return this.copy().neverChecked;
    }

    return new Intl.DateTimeFormat(this.preferences.language() === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(checkedAt);
  }

  private service(icon: HealthIcon, status: HealthStatus, options: { metric: string }) {
    const copy = this.copy().services[icon];

    return {
      icon,
      name: copy.name,
      status,
      detail: copy[status],
      metric: options.metric,
    };
  }

  private backendService(service: AdminHealthService) {
    const status = this.statusFromBackend(service.status);
    const icon = this.iconForService(service.name);

    return {
      icon,
      name: service.name,
      status,
      detail: service.message || this.copy().services[icon][status],
      metric: service.status,
    };
  }

  private pendingReviews(): number {
    return (
      this.firstDefinedNumber([
        this.numberFrom(this.planningOverview(), [
          'drafts.waiting_review',
          'drafts_pending_review',
          'summary.waiting_review',
        ]),
        this.numberFrom(this.overview(), [
          'training.drafts_waiting_review',
          'drafts_pending_review',
        ]),
      ]) ?? 0
    );
  }

  private activeUsers(): number | undefined {
    const loadedUsers = this.mergedDirectoryUsers();
    const activeDirectoryUsers = loadedUsers.filter((user) => this.activeFrom(user)).length;

    return this.firstDefinedNumber([
      this.numberFrom(this.overview(), ['users.active']),
      this.numberFrom(this.overview(), ['active_users']),
      loadedUsers.length > 0 ? activeDirectoryUsers : undefined,
    ]);
  }

  private adminUsers(): number | undefined {
    const adminAccounts = this.adminDirectory();

    if (adminAccounts.length > 0) {
      const privileged = adminAccounts.filter((user) => this.isPrivilegedUser(user)).length;

      return privileged > 0 ? privileged : adminAccounts.length;
    }

    const adminDirectoryTotal = this.adminDirectoryTotal();

    if (adminDirectoryTotal !== null) {
      return adminDirectoryTotal;
    }

    const overviewUsers = this.overview()?.users;

    if (overviewUsers) {
      return (
        this.numberFrom(overviewUsers, ['super_admins']) +
        this.numberFrom(overviewUsers, ['admins'])
      );
    }

    return this.firstDefinedNumber([
      this.numberFrom(this.overview(), ['admins_total']),
      this.numberFrom(this.planningOverview(), ['admin_users_total']),
      this.numberFrom(this.usageOverview(), ['active_admins']),
    ]);
  }

  private totalUsers(): number | undefined {
    const mergedUsers = this.mergedDirectoryUsers();

    if (mergedUsers.length > 0) {
      return mergedUsers.length;
    }

    const adminDirectoryTotal = this.adminDirectoryTotal();
    const userDirectoryTotal = this.userDirectoryTotal();

    if (adminDirectoryTotal !== null || userDirectoryTotal !== null) {
      return (adminDirectoryTotal ?? 0) + (userDirectoryTotal ?? 0);
    }

    return this.firstDefinedNumber([
      this.numberFrom(this.overview(), ['users.total']),
      this.numberFrom(this.overview(), ['users_total', 'total_users', 'user_count']),
    ]);
  }

  private planningImports(): number | undefined {
    return this.firstDefinedNumber([
      this.planningImportsCount(),
      this.numberFrom(this.planningOverview(), [
        'totals.imports',
        'admin_usage.imports_created',
        'imports_total',
        'planning_imports_total',
      ]),
      this.numberFrom(this.overview(), ['planning_imports_total', 'imports_total']),
      this.numberFrom(this.overview(), ['training.imports_total']),
    ]);
  }

  private auditEvents(): number | undefined {
    return this.firstDefinedNumber([
      this.auditEventsCount(),
      this.numberFrom(this.overview(), [
        'audit_events_total',
        'audit_logs_total',
        'audit.total',
        'audits.total',
      ]),
      this.numberFrom(this.usageOverview(), ['total_actions']),
    ]);
  }

  private draftsSent(): number | undefined {
    return this.firstDefinedNumber([
      this.sendHistoryCount(),
      this.numberFrom(this.planningOverview(), [
        'admin_usage.drafts_sent',
        'totals.sent',
        'drafts.sent',
        'drafts_sent',
        'send_history_total',
      ]),
      this.numberFrom(this.overview(), ['training.sent_drafts']),
      this.numberFrom(this.overview(), ['drafts_sent']),
    ]);
  }

  private normalizeHealth(source: unknown): AdminHealth | null {
    return this.unwrapHealthPayload<AdminHealth>(source, [
      'health',
      'system_health',
      'data',
      'result',
    ]);
  }

  private normalizeAdminOverview(source: unknown): AdminOverview | null {
    return this.unwrapHealthPayload<AdminOverview>(source, [
      'overview',
      'admin_overview',
      'dashboard',
      'data',
      'stats',
      'result',
    ]);
  }

  private normalizePlanningOverview(source: unknown): PlanningAnalyticsOverview | null {
    return this.unwrapHealthPayload<PlanningAnalyticsOverview>(source, [
      'overview',
      'analytics',
      'planning',
      'data',
      'stats',
      'result',
    ]);
  }

  private normalizeUsageOverview(source: unknown): AdminUsageOverview | null {
    return this.unwrapHealthPayload<AdminUsageOverview>(source, [
      'overview',
      'usage',
      'analytics',
      'data',
      'stats',
      'result',
    ]);
  }

  private numberFrom(source: unknown, paths: string[]): number {
    for (const path of paths) {
      const value = this.valueAt(source, path);

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }

    return 0;
  }

  private firstDefinedNumber(values: (number | null | undefined)[]): number | undefined {
    const numericValues = values.filter(
      (value): value is number => typeof value === 'number' && Number.isFinite(value),
    );

    return (
      numericValues.find((value) => value > 0) ??
      (numericValues.some((value) => value === 0) ? 0 : undefined)
    );
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

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedItems = this.collectionFrom(value, [
          'items',
          'admins',
          'users',
          'logs',
          'imports',
          'history',
          'data',
          'results',
          'records',
        ]);

        if (nestedItems.length > 0) {
          return nestedItems;
        }
      }
    }

    return [];
  }

  private totalFromResponse(source: unknown): number | null {
    if (Array.isArray(source)) {
      return source.length;
    }

    if (!source || typeof source !== 'object') {
      return null;
    }

    const direct = this.optionalNumberFrom(source, [
      'total',
      'count',
      'total_count',
      'totalCount',
      'total_items',
      'totalItems',
    ]);

    if (direct !== null) {
      return direct;
    }

    const nestedData = this.valueAt(source, 'data');

    if (nestedData && typeof nestedData === 'object') {
      return this.totalFromResponse(nestedData);
    }

    const items = this.collectionFrom(source, [
      'items',
      'admins',
      'users',
      'logs',
      'imports',
      'history',
      'data',
      'results',
      'records',
    ]);

    return items.length > 0 ? items.length : null;
  }

  private optionalNumberFrom(source: unknown, paths: string[]): number | null {
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

  private unwrapHealthPayload<T>(source: unknown, keys: string[]): T | null {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return null;
    }

    const record = source as Record<string, unknown>;

    if (this.hasHealthMetricShape(record)) {
      return record as T;
    }

    for (const key of keys) {
      const value = record[key];

      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }

      const nested = value as Record<string, unknown>;

      if (this.hasHealthMetricShape(nested)) {
        return nested as T;
      }

      const deepNested = this.unwrapHealthPayload<T>(nested, keys);

      if (deepNested) {
        return deepNested;
      }
    }

    return record as T;
  }

  private hasHealthMetricShape(record: Record<string, unknown>): boolean {
    return [
      'status',
      'services',
      'latency_ms',
      'totals',
      'summary',
      'training',
      'drafts',
      'admin_usage',
      'users',
      'total',
      'count',
      'active_admins',
      'health_check_count',
    ].some((key) => key in record);
  }

  private mergedDirectoryUsers(): unknown[] {
    const merged = new Map<string, unknown>();

    for (const user of [...this.userDirectory(), ...this.adminDirectory()]) {
      const key = this.userKey(user);

      if (key) {
        merged.set(key, user);
      }
    }

    return [...merged.values()];
  }

  private userKey(source: unknown): string {
    if (!source || typeof source !== 'object') {
      return '';
    }

    return String(
      this.valueAt(source, 'email') ??
        this.valueAt(source, 'user_email') ??
        this.valueAt(source, 'username') ??
        this.valueAt(source, 'id') ??
        this.valueAt(source, 'user_id') ??
        '',
    )
      .trim()
      .toLowerCase();
  }

  private isPrivilegedUser(source: unknown): boolean {
    const role = String(this.valueAt(source, 'role') ?? this.valueAt(source, 'admin_role') ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    return ['super_admin', 'superadmin', 'owner', 'admin', 'administrator'].includes(role);
  }

  private activeFrom(source: unknown): boolean {
    const value =
      this.valueAt(source, 'is_active') ??
      this.valueAt(source, 'isActive') ??
      this.valueAt(source, 'active') ??
      this.valueAt(source, 'enabled');

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return !['false', 'inactive', 'disabled', '0'].includes(value.toLowerCase());
    }

    return true;
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

  private statusFromBackend(status: string): HealthStatus {
    const normalized = status.toLowerCase();

    if (['healthy', 'ok', 'operational', 'up', 'success'].includes(normalized)) {
      return 'healthy';
    }

    if (['degraded', 'warning', 'attention', 'slow'].includes(normalized)) {
      return 'attention';
    }

    return 'down';
  }

  private serviceStatus(name: string): HealthStatus | null {
    const service = this.health()?.services?.find((item) =>
      item.name.toLowerCase().includes(name.toLowerCase()),
    );

    return service ? this.statusFromBackend(service.status) : null;
  }

  private iconForService(name: string): HealthIcon {
    const normalized = name.toLowerCase();

    if (normalized.includes('database') || normalized.includes('db')) {
      return 'database';
    }

    if (normalized.includes('mail') || normalized.includes('outlook')) {
      return 'mail';
    }

    if (normalized.includes('audit')) {
      return 'audit';
    }

    if (normalized.includes('planning')) {
      return 'planning';
    }

    if (normalized.includes('auth') || normalized.includes('session')) {
      return 'auth';
    }

    return 'api';
  }

  private healthFallback(error: unknown, endpointErrors: string[]) {
    endpointErrors.push(this.errorMessage(error));

    return of(null);
  }

  private formatNumber(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '-';
    }

    return new Intl.NumberFormat(this.preferences.language() === 'fr' ? 'fr-FR' : 'en-US').format(
      value,
    );
  }

  private errorMessage(error: unknown): string {
    if (isNetworkError(error)) {
      return this.copy().errors.network;
    }

    return backendErrorMessage(error, this.copy().errors.load);
  }
}
