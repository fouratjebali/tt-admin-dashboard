import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideArrowUpRight,
  LucideCalendarDays,
  LucideChartColumnIncreasing,
  LucideCircleAlert,
  LucideCircleCheckBig,
  LucideClock,
  LucideDownload,
  LucideFileText,
  LucideFilter,
  LucideMail,
  LucideRefreshCw,
  LucideSend,
  LucideShieldCheck,
  LucideTimer,
} from '@lucide/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  PaginatedResponse,
  PlanningAnalyticsDrafts,
  PlanningAnalyticsFiles,
  PlanningAnalyticsFileStat,
  PlanningAnalyticsOverview,
  PlanningAnalyticsUser,
} from '../../core/models/backend-api.model';
import { ApiService } from '../../core/services/api.service';
import { PreferencesService } from '../../core/services/preferences.service';

type MetricTone = 'teal' | 'amber' | 'sage' | 'blue';
type AnalyticsUsersResponse =
  | PaginatedResponse<PlanningAnalyticsUser>
  | PlanningAnalyticsUser[]
  | null;

interface DistributionItem {
  label: string;
  value: number;
}

const DASHBOARD_COPY = {
  en: {
    title: 'Operations overview',
    subtitle: 'Monitor planning analytics, review load, file treatment, and admin activity.',
    period: 'Analytics range',
    from: 'From',
    to: 'To',
    refresh: 'Refresh',
    export: 'Export CSV',
    apply: 'Apply',
    loading: 'Loading analytics',
    partial:
      'Some analytics sections are unavailable. Visible cards are using the data that loaded.',
    error: 'Unable to load dashboard analytics from the admin API.',
    network: 'Admin API is unreachable. Check backend URL, proxy, and network.',
    currentRange: 'Current range',
    noData: 'No data',
    metrics: {
      files: 'Files treated',
      drafts: 'Drafts prepared',
      pending: 'Pending review',
      admins: 'Active admins',
    },
    pipelineTitle: 'Planning pipeline',
    pipelineSubtitle: 'Volume across the selected range',
    pipeline: {
      imports: 'Imports',
      files: 'Excel / CSV files',
      drafts: 'Drafts',
      reviewed: 'Reviewed',
      sent: 'Sent',
    },
    filesTitle: 'Recent treated files',
    draftsTitle: 'Draft distribution',
    usersTitle: 'Admin usage',
    statusTitle: 'Analytics status',
    table: {
      file: 'File',
      status: 'Status',
      rows: 'Rows',
      date: 'Date',
      user: 'Admin user',
      prepared: 'Prepared',
      reviewed: 'Reviewed',
      sent: 'Sent',
      total: 'Total actions',
    },
    status: {
      overview: 'Overview analytics',
      files: 'File analytics',
      drafts: 'Draft analytics',
      users: 'Admin usage analytics',
      available: 'Available',
      unavailable: 'Unavailable',
    },
  },
  fr: {
    title: 'Vue globale operations',
    subtitle: "Suivez l'analytics planning, la revue, les fichiers traites et l'activite admin.",
    period: 'Periode analytics',
    from: 'De',
    to: 'A',
    refresh: 'Actualiser',
    export: 'Exporter CSV',
    apply: 'Appliquer',
    loading: 'Chargement analytics',
    partial:
      'Certaines sections analytics sont indisponibles. Les cartes visibles utilisent les donnees chargees.',
    error: "Impossible de charger l'analytics dashboard depuis l'API admin.",
    network: "API admin inaccessible. Verifiez l'URL backend, le proxy et le reseau.",
    currentRange: 'Periode courante',
    noData: 'Aucune donnee',
    metrics: {
      files: 'Fichiers traites',
      drafts: 'Drafts prepares',
      pending: 'En revue',
      admins: 'Admins actifs',
    },
    pipelineTitle: 'Pipeline planning',
    pipelineSubtitle: 'Volume sur la periode selectionnee',
    pipeline: {
      imports: 'Imports',
      files: 'Fichiers Excel / CSV',
      drafts: 'Drafts',
      reviewed: 'Revus',
      sent: 'Envoyes',
    },
    filesTitle: 'Fichiers traites recents',
    draftsTitle: 'Distribution drafts',
    usersTitle: 'Usage admin',
    statusTitle: 'Etat analytics',
    table: {
      file: 'Fichier',
      status: 'Statut',
      rows: 'Lignes',
      date: 'Date',
      user: 'Admin user',
      prepared: 'Prepares',
      reviewed: 'Revus',
      sent: 'Envoyes',
      total: 'Total actions',
    },
    status: {
      overview: 'Analytics overview',
      files: 'Analytics fichiers',
      drafts: 'Analytics drafts',
      users: 'Analytics usage admin',
      available: 'Disponible',
      unavailable: 'Indisponible',
    },
  },
};

@Component({
  selector: 'app-dashboard-page',
  imports: [
    LucideArrowUpRight,
    LucideCalendarDays,
    LucideChartColumnIncreasing,
    LucideCircleAlert,
    LucideCircleCheckBig,
    LucideClock,
    LucideDownload,
    LucideFileText,
    LucideFilter,
    LucideMail,
    LucideRefreshCw,
    LucideSend,
    LucideShieldCheck,
    LucideTimer,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly preferences = inject(PreferencesService);

  protected readonly copy = computed(() => DASHBOARD_COPY[this.preferences.language()]);
  protected readonly dateFrom = signal(this.defaultDateFrom());
  protected readonly dateTo = signal(this.formatInputDate(new Date()));
  protected readonly overview = signal<PlanningAnalyticsOverview | null>(null);
  protected readonly files = signal<PlanningAnalyticsFiles | null>(null);
  protected readonly drafts = signal<PlanningAnalyticsDrafts | null>(null);
  protected readonly users = signal<PlanningAnalyticsUser[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly warning = signal('');
  protected readonly checkedAt = signal<Date | null>(null);

  protected readonly periodLabel = computed(() => {
    const from = this.formatDisplayDate(this.dateFrom());
    const to = this.formatDisplayDate(this.dateTo());

    return `${from} - ${to}`;
  });

  protected readonly metrics = computed(() => [
    {
      label: this.copy().metrics.files,
      value: this.formatNumber(this.filesTreated()),
      change: this.copy().currentRange,
      tone: 'teal' as MetricTone,
    },
    {
      label: this.copy().metrics.drafts,
      value: this.formatNumber(this.draftsPrepared()),
      change: this.copy().currentRange,
      tone: 'sage' as MetricTone,
    },
    {
      label: this.copy().metrics.pending,
      value: this.formatNumber(
        this.numberFrom(this.overview(), ['drafts_pending_review', 'pending_review']),
      ),
      change: this.copy().currentRange,
      tone: 'amber' as MetricTone,
    },
    {
      label: this.copy().metrics.admins,
      value: this.formatNumber(
        this.numberFrom(this.overview(), ['active_admins', 'admin_users_total']),
      ),
      change: this.copy().currentRange,
      tone: 'blue' as MetricTone,
    },
  ]);

  protected readonly pipeline = computed(() => {
    const steps = [
      { label: this.copy().pipeline.imports, count: this.importsTotal() },
      { label: this.copy().pipeline.files, count: this.filesTreated() },
      { label: this.copy().pipeline.drafts, count: this.draftsPrepared() },
      { label: this.copy().pipeline.reviewed, count: this.draftsReviewed() },
      { label: this.copy().pipeline.sent, count: this.draftsSent() },
    ];
    const max = Math.max(...steps.map((step) => step.count), 1);

    return steps.map((step) => ({
      ...step,
      value: Math.round((step.count / max) * 100),
    }));
  });

  protected readonly recentFiles = computed(() =>
    this.collectionFrom<PlanningAnalyticsFileStat>(this.files(), [
      'recent_treated_files',
      'recent_files',
      'files',
    ]).slice(0, 5),
  );

  protected readonly draftDistribution = computed(() =>
    this.distributionFrom(this.drafts()?.by_status).slice(0, 5),
  );

  protected readonly topUsers = computed(() =>
    [...this.users()].sort((a, b) => this.userActions(b) - this.userActions(a)).slice(0, 5),
  );

  protected readonly statusRows = computed(() => [
    {
      label: this.copy().status.overview,
      available: Boolean(this.overview()),
    },
    {
      label: this.copy().status.files,
      available: Boolean(this.files()),
    },
    {
      label: this.copy().status.drafts,
      available: Boolean(this.drafts()),
    },
    {
      label: this.copy().status.users,
      available: this.users().length > 0,
    },
  ]);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  protected loadAnalytics(): void {
    const filters = {
      date_from: this.dateFrom(),
      date_to: this.dateTo(),
    };
    const endpointErrors: string[] = [];

    this.loading.set(true);
    this.error.set('');
    this.warning.set('');

    forkJoin({
      overview: this.apiService
        .getPlanningAnalyticsOverview(filters)
        .pipe(catchError((error: unknown) => this.analyticsFallback(error, endpointErrors))),
      files: this.apiService
        .getPlanningAnalyticsFiles({ ...filters, limit: 20 })
        .pipe(catchError((error: unknown) => this.analyticsFallback(error, endpointErrors))),
      drafts: this.apiService
        .getPlanningAnalyticsDrafts({ ...filters, limit: 20 })
        .pipe(catchError((error: unknown) => this.analyticsFallback(error, endpointErrors))),
      users: this.apiService
        .getPlanningAnalyticsUsers({ ...filters, limit: 50, offset: 0 })
        .pipe(catchError((error: unknown) => this.analyticsFallback(error, endpointErrors))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(({ overview, files, drafts, users }) => {
        this.overview.set(overview as PlanningAnalyticsOverview | null);
        this.files.set(files as PlanningAnalyticsFiles | null);
        this.drafts.set(drafts as PlanningAnalyticsDrafts | null);
        this.users.set(this.normalizeUsers(users as AnalyticsUsersResponse));
        this.checkedAt.set(new Date());

        if (!overview && !files && !drafts && !users) {
          this.error.set(endpointErrors[0] ?? this.copy().error);
        } else if (endpointErrors.length > 0) {
          this.warning.set(this.copy().partial);
        }
      });
  }

  protected updateDateFrom(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.dateFrom.set(input.value);
  }

  protected updateDateTo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.dateTo.set(input.value);
  }

  protected exportCsv(): void {
    const headers = ['metric', 'value'];
    const rows = [
      ['imports_total', this.importsTotal()],
      ['files_treated', this.filesTreated()],
      ['drafts_prepared', this.draftsPrepared()],
      ['drafts_reviewed', this.draftsReviewed()],
      ['drafts_sent', this.draftsSent()],
      ['active_admins', this.numberFrom(this.overview(), ['active_admins', 'admin_users_total'])],
    ];
    const csv = [
      headers.join(','),
      ...rows.map(([label, value]) => `"${label}","${String(value).replace(/"/g, '""')}"`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `planning-overview-${this.dateFrom()}-${this.dateTo()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected fileName(file: PlanningAnalyticsFileStat): string {
    return this.stringFrom(file, ['filename', 'name', 'file_name']) || this.copy().noData;
  }

  protected fileStatus(file: PlanningAnalyticsFileStat): string {
    return this.stringFrom(file, ['status']) || this.copy().noData;
  }

  protected fileRows(file: PlanningAnalyticsFileStat): string {
    return this.formatNumber(this.numberFrom(file, ['rows_total', 'rows', 'total_rows']));
  }

  protected fileDate(file: PlanningAnalyticsFileStat): string {
    const value = this.stringFrom(file, ['treated_at', 'completed_at', 'created_at']);

    return value ? this.formatDisplayDate(value) : '-';
  }

  protected userName(user: PlanningAnalyticsUser): string {
    return user.full_name ?? user.name ?? user.email ?? user.user_id ?? this.copy().noData;
  }

  protected userPrepared(user: PlanningAnalyticsUser): string {
    return this.formatNumber(this.numberFrom(user, ['drafts_prepared']));
  }

  protected userReviewed(user: PlanningAnalyticsUser): string {
    return this.formatNumber(this.numberFrom(user, ['drafts_reviewed']));
  }

  protected userSent(user: PlanningAnalyticsUser): string {
    return this.formatNumber(this.numberFrom(user, ['drafts_sent']));
  }

  protected userActions(user: PlanningAnalyticsUser): number {
    return this.numberFrom(user, ['total_planning_actions', 'planning_actions_total']);
  }

  protected statusLabel(available: boolean): string {
    return available ? this.copy().status.available : this.copy().status.unavailable;
  }

  private importsTotal(): number {
    return this.numberFrom(this.overview(), ['imports_total', 'planning_imports_total']);
  }

  private filesTreated(): number {
    const overviewFiles = this.numberFrom(this.overview(), [
      'files_treated',
      'treated_files_total',
      'files_total',
    ]);

    if (overviewFiles > 0) {
      return overviewFiles;
    }

    return (
      this.numberFrom(this.overview(), ['excel_files_total', 'excel_total']) +
      this.numberFrom(this.overview(), ['csv_files_total', 'csv_total'])
    );
  }

  private draftsPrepared(): number {
    return this.numberFrom(this.overview(), ['drafts_prepared', 'drafts_ready', 'drafts_total']);
  }

  private draftsReviewed(): number {
    return this.numberFrom(this.overview(), ['drafts_reviewed', 'drafts_approved']);
  }

  private draftsSent(): number {
    return this.numberFrom(this.overview(), ['drafts_sent', 'send_history_total']);
  }

  private normalizeUsers(response: AnalyticsUsersResponse): PlanningAnalyticsUser[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    return (
      response.items ?? this.collectionFrom<PlanningAnalyticsUser>(response, ['users', 'data'])
    );
  }

  private distributionFrom(value: unknown): DistributionItem[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => ({
          label: this.stringFrom(item, ['status', 'email_type', 'extension', 'label', 'name']),
          value: this.numberFrom(item, ['count', 'total', 'value']),
        }))
        .filter((item) => item.label);
    }

    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).map(([label, total]) => ({
        label,
        value: this.numberFrom({ total }, ['total']),
      }));
    }

    return [];
  }

  private collectionFrom<T>(source: unknown, keys: string[]): T[] {
    if (!source || typeof source !== 'object') {
      return [];
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    return [];
  }

  private stringFrom(source: unknown, keys: string[]): string {
    if (!source || typeof source !== 'object') {
      return '';
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return '';
  }

  private numberFrom(source: unknown, keys: string[]): number {
    if (!source || typeof source !== 'object') {
      return 0;
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }

    return 0;
  }

  private analyticsFallback(error: unknown, endpointErrors: string[]) {
    endpointErrors.push(this.errorMessage(error));

    return of(null);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.copy().network;
    }

    return this.copy().error;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat(this.preferences.language() === 'fr' ? 'fr-FR' : 'en-US').format(
      value,
    );
  }

  private formatDisplayDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(this.preferences.language() === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'medium',
    }).format(date);
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
