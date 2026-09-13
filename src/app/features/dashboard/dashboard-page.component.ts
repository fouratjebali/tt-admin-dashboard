import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideArrowUpRight,
  LucideCalendarDays,
  LucideChartColumnIncreasing,
  LucideCircleAlert,
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
  AdminOverview,
  AdminUsageAdmin,
  AdminUsageOverview,
  PlanningAnalyticsDrafts,
  PlanningAnalyticsFiles,
  PlanningAnalyticsFileStat,
  PlanningAnalyticsOverview,
} from '../../core/models/backend-api.model';
import { ApiService } from '../../core/services/api.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { backendErrorMessage, isNetworkError } from '../../core/utils/api-error.util';

type MetricTone = 'teal' | 'amber' | 'sage' | 'blue';

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
    table: {
      file: 'File',
      status: 'Status',
      rows: 'Rows',
      date: 'Date',
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
    table: {
      file: 'Fichier',
      status: 'Statut',
      rows: 'Lignes',
      date: 'Date',
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
  protected readonly adminOverview = signal<AdminOverview | null>(null);
  protected readonly usageOverview = signal<AdminUsageOverview | null>(null);
  protected readonly usageAdmins = signal<AdminUsageAdmin[]>([]);
  protected readonly files = signal<PlanningAnalyticsFiles | null>(null);
  protected readonly drafts = signal<PlanningAnalyticsDrafts | null>(null);
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
        this.firstNumber([
          this.numberFrom(this.overview(), ['drafts.waiting_review', 'drafts_pending_review']),
          this.numberFrom(this.drafts(), ['summary.waiting_review']),
          this.numberFrom(this.adminOverview(), ['training.drafts_waiting_review']),
        ]),
      ),
      change: this.copy().currentRange,
      tone: 'amber' as MetricTone,
    },
    {
      label: this.copy().metrics.admins,
      value: this.formatNumber(this.activeDashboardUsers()),
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

  protected readonly draftDistribution = computed(() => this.draftStatusDistribution().slice(0, 5));

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
      adminOverview: this.apiService
        .getOverview()
        .pipe(catchError((error: unknown) => this.analyticsFallback(error, endpointErrors))),
      overview: this.apiService
        .getPlanningAnalyticsOverview(filters)
        .pipe(catchError((error: unknown) => this.analyticsFallback(error, endpointErrors))),
      files: this.apiService
        .getPlanningAnalyticsFiles({ ...filters, limit: 20 })
        .pipe(catchError((error: unknown) => this.analyticsFallback(error, endpointErrors))),
      drafts: this.apiService
        .getPlanningAnalyticsDrafts({ ...filters, limit: 20 })
        .pipe(catchError((error: unknown) => this.analyticsFallback(error, endpointErrors))),
      usageOverview: this.apiService
        .getAdminUsageOverview(filters)
        .pipe(catchError(() => of(null))),
      usageAdmins: this.apiService
        .listAdminUsageAdmins({ limit: 100, offset: 0 })
        .pipe(catchError(() => of(null))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(({ adminOverview, overview, files, drafts, usageOverview, usageAdmins }) => {
        this.adminOverview.set(adminOverview as AdminOverview | null);
        this.overview.set(overview as PlanningAnalyticsOverview | null);
        this.usageOverview.set(this.normalizeUsageOverview(usageOverview));
        this.usageAdmins.set(this.normalizeUsageAdmins(usageAdmins));
        this.files.set(files as PlanningAnalyticsFiles | null);
        this.drafts.set(drafts as PlanningAnalyticsDrafts | null);
        this.checkedAt.set(new Date());

        if (!adminOverview && !overview && !files && !drafts) {
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
      ['active_admins', this.activeDashboardUsers()],
      ['dashboard_users', this.activeDashboardUsers()],
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
    const value = this.stringFrom(file, [
      'imported_at',
      'treated_at',
      'completed_at',
      'created_at',
    ]);

    return value ? this.formatDisplayDate(value) : '-';
  }

  private importsTotal(): number {
    return this.firstNumber([
      this.numberFrom(this.overview(), ['totals.imports', 'admin_usage.imports_created']),
      this.numberFrom(this.overview(), ['imports_total', 'planning_imports_total']),
      this.numberFrom(this.adminOverview(), ['planning_imports_total']),
    ]);
  }

  private filesTreated(): number {
    const overviewFiles = this.firstNumber([
      this.numberFrom(this.overview(), [
        'totals.files',
        'files_treated',
        'treated_files_total',
        'files_total',
      ]),
      this.numberFrom(this.files(), ['summary.treated_files']),
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
    return this.firstNumber([
      this.numberFrom(this.overview(), [
        'admin_usage.drafts_generated',
        'totals.drafts',
        'drafts_prepared',
        'drafts_ready',
        'drafts_total',
      ]),
      this.numberFrom(this.drafts(), ['summary.total_drafts']),
    ]);
  }

  private draftsReviewed(): number {
    return this.numberFrom(this.overview(), [
      'admin_usage.drafts_reviewed',
      'drafts_reviewed',
      'drafts_approved',
    ]);
  }

  private draftsSent(): number {
    return this.firstNumber([
      this.numberFrom(this.overview(), [
        'admin_usage.drafts_sent',
        'totals.sent',
        'drafts_sent',
        'send_history_total',
      ]),
      this.numberFrom(this.drafts(), ['summary.sent']),
      this.numberFrom(this.adminOverview(), ['training.sent_drafts']),
    ]);
  }

  private activeDashboardUsers(): number {
    const overview = this.adminOverview();
    const users = overview?.users;
    const roleTotal = users
      ? this.numberFrom(users, ['super_admins']) + this.numberFrom(users, ['admins'])
      : 0;

    return this.firstNumber([
      roleTotal,
      this.numberFrom(this.adminOverview(), [
        'active_admins',
        'admins_total',
        'users.active_admins',
        'users.active_admin_count',
      ]),
      this.numberFrom(this.usageOverview(), [
        'active_admins',
        'active_admin_count',
        'admins.active',
        'admins.active_admins',
        'admins.active_count',
        'admin_users.active',
        'totals.active_admins',
        'summary.active_admins',
      ]),
      this.usageAdmins().filter((admin) => this.activeFrom(admin)).length,
      this.numberFrom(this.overview(), [
        'active_admins',
        'admin_users_total',
        'totals.active_admins',
        'summary.active_admins',
      ]),
    ]);
  }

  private normalizeUsageOverview(source: unknown): AdminUsageOverview | null {
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

  private normalizeUsageAdmins(source: unknown): AdminUsageAdmin[] {
    return this.collectionFrom<AdminUsageAdmin>(source, [
      'items',
      'admins',
      'users',
      'data',
      'results',
      'records',
    ]);
  }

  private activeFrom(source: unknown): boolean {
    if (!source || typeof source !== 'object') {
      return false;
    }

    const value = this.valueAt(source, 'is_active') ?? this.valueAt(source, 'active');

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return !['false', 'inactive', 'disabled', '0'].includes(value.toLowerCase());
    }

    return true;
  }

  private draftStatusDistribution(): DistributionItem[] {
    const byStatus = this.distributionFrom(this.drafts()?.by_status);

    if (byStatus.length > 0) {
      return byStatus;
    }

    const source = this.drafts()?.summary ?? this.overview()?.drafts;

    return [
      { label: 'waiting_review', value: this.numberFrom(source, ['waiting_review']) },
      { label: 'approved', value: this.numberFrom(source, ['approved']) },
      { label: 'sent', value: this.numberFrom(source, ['sent']) },
      { label: 'rejected', value: this.numberFrom(source, ['rejected']) },
    ].filter((item) => item.value > 0);
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
    if (Array.isArray(source)) {
      return source as T[];
    }

    if (!source || typeof source !== 'object') {
      return [];
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value as T[];
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedItems = this.collectionFrom<T>(value, ['items', 'users', 'data', 'results']);

        if (nestedItems.length > 0) {
          return nestedItems;
        }
      }
    }

    return [];
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
    }

    return '';
  }

  private numberFrom(source: unknown, keys: string[]): number {
    if (!source || typeof source !== 'object') {
      return 0;
    }

    for (const key of keys) {
      const value = this.valueAt(source, key);

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }

    return 0;
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

  private firstNumber(values: number[]): number {
    return values.find((value) => value > 0) ?? 0;
  }

  private analyticsFallback(error: unknown, endpointErrors: string[]) {
    endpointErrors.push(this.errorMessage(error));

    return of(null);
  }

  private errorMessage(error: unknown): string {
    if (isNetworkError(error)) {
      return this.copy().network;
    }

    return backendErrorMessage(error, this.copy().error);
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
