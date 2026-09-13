import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideBell,
  LucideCheck,
  LucideCircleAlert,
  LucideClock,
  LucideDatabase,
  LucideKeyRound,
  LucideLanguages,
  LucideMail,
  LucideMonitor,
  LucideMoon,
  LucidePalette,
  LucideRefreshCw,
  LucideRotateCcw,
  LucideSave,
  LucideServer,
  LucideSettings,
  LucideShieldCheck,
  LucideSlidersHorizontal,
  LucideSun,
  LucideUser,
} from '@lucide/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  AdminDashboardPolicies,
  AdminEmailPipelineSettings,
  AdminPlanningAutomationSettings,
  AdminSettings,
  AdminSettingsSupervision,
  AdminSettingsSystem,
} from '../../core/models/backend-api.model';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { backendErrorMessage, isNetworkError } from '../../core/utils/api-error.util';
import { Language, PreferencesService, Theme } from '../../core/services/preferences.service';

interface PolicyForm {
  reviewWarningThreshold: number;
  auditRetentionDays: number;
  supportEmail: string;
}

interface AutomationForm {
  autoDraftGenerationAfterImport: boolean;
  defaultDraftType: string;
  includeParticipants: boolean;
  maxDraftsPerRun: number;
}

interface EmailPipelineForm {
  enabled: boolean;
  intervalMinutes: number;
  maxEmails: number;
}

const COPY = {
  en: {
    eyebrow: 'Controls',
    title: 'Global settings',
    body: 'Tune dashboard policies, planning automation, email pipeline, and supervision signals.',
    refresh: 'Refresh',
    save: 'Save',
    saved: 'Settings saved',
    loading: 'Loading settings',
    retry: 'Retry',
    browserOnly: 'Saved on this browser',
    partial:
      'Some supervision settings are unavailable. Editable settings that loaded can still be saved.',
    panels: {
      appearance: 'Workspace appearance',
      policy: 'Dashboard policies',
      automation: 'Planning automation',
      pipeline: 'Email pipeline',
      system: 'System status',
      credentials: 'Admin credentials',
      account: 'Admin profile',
    },
    fields: {
      language: 'Language',
      theme: 'Theme',
      english: 'English',
      french: 'French',
      light: 'Light',
      dark: 'Dark',
      reviewThreshold: 'Review warning threshold',
      retentionDays: 'Audit retention days',
      supportEmail: 'Support email',
      autoDraft: 'Auto draft after import',
      draftType: 'Default draft type',
      includeParticipants: 'Include participants',
      maxDrafts: 'Max drafts per run',
      pipelineEnabled: 'Pipeline enabled',
      interval: 'Interval minutes',
      maxEmails: 'Max emails',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      session: 'Session',
    },
    system: {
      apiPrefixes: 'API prefixes',
      corsOrigins: 'CORS origins',
      dbConfigured: 'Database configured',
      connectorConfigured: 'Connector configured',
      outlookConfigured: 'Outlook app configured',
      username: 'Preset username',
      password: 'Preset password',
      email: 'Preset email',
      displayName: 'Display name',
    },
    hints: {
      language: 'Changes apply instantly across the admin dashboard.',
      theme: 'Choose the default visual mode for this browser.',
      policy: 'Saved through the admin dashboard policy endpoint.',
      automation: 'Controls draft generation defaults after planning imports.',
      pipeline: 'Controls the email sending worker limits.',
      system: 'Read-only deployment and connector checks from the backend.',
      session: 'Bearer token is available for protected admin requests.',
    },
    values: {
      active: 'Active',
      missing: 'Not available',
      enabled: 'Enabled',
      disabled: 'Disabled',
      configured: 'Configured',
      notConfigured: 'Not configured',
      tokenReady: 'Bearer token ready',
      noToken: 'No local token',
    },
    draftTypes: {
      standard: 'Standard',
      reminder: 'Reminder',
      escalation: 'Escalation',
    },
    errors: {
      load: 'Unable to load admin settings from the admin API.',
      save: 'Unable to save admin settings.',
      network: 'Admin API is unreachable. Check backend URL, proxy, and network.',
    },
  },
  fr: {
    eyebrow: 'Controles',
    title: 'Parametres globaux',
    body: "Ajustez les policies dashboard, l'automation planning, le pipeline email et la supervision.",
    refresh: 'Actualiser',
    save: 'Enregistrer',
    saved: 'Parametres enregistres',
    loading: 'Chargement parametres',
    retry: 'Reessayer',
    browserOnly: 'Enregistre sur ce navigateur',
    partial:
      'Certaines donnees de supervision sont indisponibles. Les parametres charges restent modifiables.',
    panels: {
      appearance: 'Apparence espace',
      policy: 'Policies dashboard',
      automation: 'Automation planning',
      pipeline: 'Pipeline email',
      system: 'Etat systeme',
      credentials: 'Credentials admin',
      account: 'Profil admin',
    },
    fields: {
      language: 'Langue',
      theme: 'Theme',
      english: 'Anglais',
      french: 'Francais',
      light: 'Clair',
      dark: 'Sombre',
      reviewThreshold: 'Seuil alerte revue',
      retentionDays: 'Retention audit jours',
      supportEmail: 'Email support',
      autoDraft: 'Draft auto apres import',
      draftType: 'Type draft par defaut',
      includeParticipants: 'Inclure participants',
      maxDrafts: 'Max drafts par run',
      pipelineEnabled: 'Pipeline active',
      interval: 'Intervalle minutes',
      maxEmails: 'Max emails',
      name: 'Nom',
      email: 'Email',
      role: 'Role',
      session: 'Session',
    },
    system: {
      apiPrefixes: 'Prefixes API',
      corsOrigins: 'Origines CORS',
      dbConfigured: 'Database configuree',
      connectorConfigured: 'Connecteur configure',
      outlookConfigured: 'App Outlook configuree',
      username: 'Username preset',
      password: 'Password preset',
      email: 'Email preset',
      displayName: 'Display name',
    },
    hints: {
      language: "Le changement s'applique directement sur le dashboard admin.",
      theme: 'Choisissez le mode visuel par defaut pour ce navigateur.',
      policy: "Enregistre via l'endpoint des policies dashboard admin.",
      automation: 'Controle les defauts de generation draft apres import planning.',
      pipeline: "Controle les limites du worker d'envoi email.",
      system: 'Controles deploiement et connecteurs en lecture seule depuis le backend.',
      session: 'Le token Bearer est disponible pour les requetes admin protegees.',
    },
    values: {
      active: 'Active',
      missing: 'Non disponible',
      enabled: 'Active',
      disabled: 'Desactive',
      configured: 'Configure',
      notConfigured: 'Non configure',
      tokenReady: 'Token Bearer pret',
      noToken: 'Aucun token local',
    },
    draftTypes: {
      standard: 'Standard',
      reminder: 'Rappel',
      escalation: 'Escalade',
    },
    errors: {
      load: "Impossible de charger les parametres admin depuis l'API admin.",
      save: "Impossible d'enregistrer les parametres admin.",
      network: "API admin inaccessible. Verifiez l'URL backend, le proxy et le reseau.",
    },
  },
};

@Component({
  selector: 'app-settings-page',
  imports: [
    LucideBell,
    LucideCheck,
    LucideCircleAlert,
    LucideClock,
    LucideDatabase,
    LucideKeyRound,
    LucideLanguages,
    LucideMail,
    LucideMonitor,
    LucideMoon,
    LucidePalette,
    LucideRefreshCw,
    LucideRotateCcw,
    LucideSave,
    LucideServer,
    LucideSettings,
    LucideShieldCheck,
    LucideSlidersHorizontal,
    LucideSun,
    LucideUser,
  ],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly preferences = inject(PreferencesService);

  protected readonly copy = computed(() => COPY[this.preferences.language()]);
  protected readonly language = this.preferences.language;
  protected readonly theme = this.preferences.theme;
  protected readonly currentAdmin = this.authService.currentAdmin;
  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly settings = signal<AdminSettings | null>(null);
  protected readonly system = signal<AdminSettingsSystem | null>(null);
  protected readonly supervision = signal<AdminSettingsSupervision | null>(null);
  protected readonly policy = signal<PolicyForm>(this.defaultPolicySettings());
  protected readonly automation = signal<AutomationForm>(this.defaultAutomationSettings());
  protected readonly emailPipeline = signal<EmailPipelineForm>(this.defaultEmailPipelineSettings());
  protected readonly loading = signal(false);
  protected readonly savingPolicies = signal(false);
  protected readonly savingSettings = signal(false);
  protected readonly error = signal('');
  protected readonly warning = signal('');
  protected readonly savedMessage = signal('');
  protected readonly draftTypeOptions = ['standard', 'reminder', 'escalation'];

  protected readonly accountRows = computed(() => {
    const admin = this.currentAdmin();

    return [
      {
        icon: 'user',
        label: this.copy().fields.name,
        value: admin?.display_name ?? admin?.full_name ?? admin?.name ?? this.copy().values.missing,
      },
      {
        icon: 'mail',
        label: this.copy().fields.email,
        value: admin?.email ?? this.copy().values.missing,
      },
      {
        icon: 'shield',
        label: this.copy().fields.role,
        value: admin?.role ?? this.copy().values.missing,
      },
      {
        icon: 'key',
        label: this.copy().fields.session,
        value: this.isAuthenticated() ? this.copy().values.tokenReady : this.copy().values.noToken,
      },
    ];
  });

  protected readonly systemRows = computed(() => {
    const system = this.system();
    const backend = this.recordFrom(system, ['backend']);
    const database = this.recordFrom(system, ['database']);
    const connector = this.recordFrom(system, ['mail_connector', 'mailConnector']);

    return [
      {
        label: this.copy().system.apiPrefixes,
        value: this.listLabel(
          this.valueFrom(backend, ['api_prefix', 'apiPrefix']) ||
            this.valueFrom(backend, ['admin_api_prefix', 'adminApiPrefix']) ||
            this.valueFrom(system, ['api_prefixes', 'apiPrefixes']),
        ),
        healthy: true,
      },
      {
        label: this.copy().system.corsOrigins,
        value: this.listLabel(
          this.valueFrom(backend, ['cors_origins', 'corsOrigins']) ||
            this.valueFrom(system, ['cors_origins', 'corsOrigins']),
        ),
        healthy: true,
      },
      {
        label: this.copy().system.dbConfigured,
        value: this.configuredLabel(
          this.booleanFrom(database, ['configured']) ||
            this.booleanFrom(system, ['db_configured', 'database_configured']),
        ),
        healthy:
          this.booleanFrom(database, ['configured']) ||
          this.booleanFrom(system, ['db_configured', 'database_configured']),
      },
      {
        label: this.copy().system.connectorConfigured,
        value: this.configuredLabel(
          this.booleanFrom(connector, ['agent1_configured', 'agent2_configured']) ||
            this.booleanFrom(system, ['connector_configured']),
        ),
        healthy:
          this.booleanFrom(connector, ['agent1_configured', 'agent2_configured']) ||
          this.booleanFrom(system, ['connector_configured']),
      },
      {
        label: this.copy().system.outlookConfigured,
        value: this.configuredLabel(
          this.booleanFrom(connector, ['outlook_client_configured']) ||
            this.booleanFrom(system, ['outlook_app_configured']),
        ),
        healthy:
          this.booleanFrom(connector, ['outlook_client_configured']) ||
          this.booleanFrom(system, ['outlook_app_configured']),
      },
    ];
  });

  protected readonly credentialRows = computed(() => {
    const credentials =
      this.recordFrom(this.system(), ['admin_credentials', 'adminCredentials']) ??
      this.recordFrom(this.recordFrom(this.supervision(), ['system']), [
        'admin_credentials',
        'adminCredentials',
      ]) ??
      this.recordFrom(this.supervision(), ['admin_credentials', 'credentials', 'adminCredentials']);

    return [
      {
        label: this.copy().system.username,
        configured: this.booleanFrom(credentials, [
          'username_configured',
          'admin_username_configured',
          'preset_username_configured',
        ]),
      },
      {
        label: this.copy().system.password,
        configured: this.booleanFrom(credentials, [
          'password_configured',
          'admin_password_configured',
          'preset_password_configured',
        ]),
      },
      {
        label: this.copy().system.email,
        configured: this.booleanFrom(credentials, ['email_configured', 'admin_email_configured']),
      },
      {
        label: this.copy().system.displayName,
        configured:
          this.booleanFrom(credentials, ['display_name_configured', 'displayNameConfigured']) ||
          Boolean(this.stringFrom(credentials, ['display_name', 'displayName'])),
      },
    ];
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  protected setLanguage(language: Language): void {
    this.preferences.setLanguage(language);
    this.flashSavedMessage(this.copy().browserOnly);
  }

  protected setTheme(theme: Theme): void {
    this.preferences.setTheme(theme);
    this.flashSavedMessage(this.copy().browserOnly);
  }

  protected loadSettings(): void {
    const endpointErrors: string[] = [];

    this.loading.set(true);
    this.error.set('');
    this.warning.set('');

    forkJoin({
      settings: this.apiService
        .getAdminSettings()
        .pipe(catchError((error: unknown) => this.settingsFallback(error, endpointErrors))),
      system: this.apiService
        .getAdminSettingsSystem()
        .pipe(catchError((error: unknown) => this.settingsFallback(error, endpointErrors))),
      supervision: this.apiService
        .getAdminSettingsSupervision()
        .pipe(catchError((error: unknown) => this.settingsFallback(error, endpointErrors))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(({ settings, system, supervision }) => {
        const settingsPayload = this.settingsPayload<AdminSettings>(settings);
        const systemPayload = this.settingsPayload<AdminSettingsSystem>(system);
        const supervisionPayload = this.settingsPayload<AdminSettingsSupervision>(supervision);

        this.settings.set(settingsPayload);
        this.system.set(systemPayload);
        this.supervision.set(supervisionPayload);

        if (settingsPayload || supervisionPayload || systemPayload) {
          this.syncEditableForms(settingsPayload, supervisionPayload, systemPayload);
        }

        if (!settings && !system && !supervision) {
          this.error.set(endpointErrors[0] ?? this.copy().errors.load);
        } else if (endpointErrors.length > 0) {
          this.warning.set(this.copy().partial);
        }
      });
  }

  protected savePolicySettings(): void {
    this.savingPolicies.set(true);
    this.error.set('');

    this.apiService
      .updateAdminSettingsPolicies(this.policyPayload())
      .pipe(finalize(() => this.savingPolicies.set(false)))
      .subscribe({
        next: (policies) => {
          const policyPayload = this.settingsPayload<AdminDashboardPolicies>(policies) ?? policies;

          this.policy.set(this.policyFormFrom(policyPayload));
          this.settings.update((settings) => ({
            ...(settings ?? {}),
            policies: policyPayload,
          }));
          this.flashSavedMessage(this.copy().saved);
        },
        error: (error: unknown) =>
          this.error.set(this.errorMessage(error, this.copy().errors.save)),
      });
  }

  protected saveOperationalSettings(): void {
    this.savingSettings.set(true);
    this.error.set('');

    this.apiService
      .updateAutomationSettings(this.automationPayload())
      .pipe(finalize(() => this.savingSettings.set(false)))
      .subscribe({
        next: (settings) => {
          const automationPayload =
            this.settingsPayload<AdminPlanningAutomationSettings>(settings) ?? settings;
          this.automation.set(this.automationFormFrom(automationPayload));
          this.flashSavedMessage(this.copy().saved);
        },
        error: (error: unknown) =>
          this.error.set(this.errorMessage(error, this.copy().errors.save)),
      });
  }

  protected updateReviewThreshold(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.policy.update((settings) => ({
      ...settings,
      reviewWarningThreshold: this.clampNumber(
        input.valueAsNumber,
        1,
        500,
        settings.reviewWarningThreshold,
      ),
    }));
  }

  protected updateRetentionDays(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.policy.update((settings) => ({
      ...settings,
      auditRetentionDays: this.clampNumber(
        input.valueAsNumber,
        7,
        3650,
        settings.auditRetentionDays,
      ),
    }));
  }

  protected updateSupportEmail(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.policy.update((settings) => ({ ...settings, supportEmail: input.value }));
  }

  protected updateAutoDraft(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.automation.update((settings) => ({
      ...settings,
      autoDraftGenerationAfterImport: input.checked,
    }));
  }

  protected updateDefaultDraftType(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.automation.update((settings) => ({ ...settings, defaultDraftType: select.value }));
  }

  protected updateIncludeParticipants(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.automation.update((settings) => ({ ...settings, includeParticipants: input.checked }));
  }

  protected updateMaxDrafts(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.automation.update((settings) => ({
      ...settings,
      maxDraftsPerRun: this.clampNumber(input.valueAsNumber, 1, 1000, settings.maxDraftsPerRun),
    }));
  }

  protected updatePipelineEnabled(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.emailPipeline.update((settings) => ({ ...settings, enabled: input.checked }));
  }

  protected updatePipelineInterval(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.emailPipeline.update((settings) => ({
      ...settings,
      intervalMinutes: this.clampNumber(input.valueAsNumber, 1, 1440, settings.intervalMinutes),
    }));
  }

  protected updatePipelineMaxEmails(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.emailPipeline.update((settings) => ({
      ...settings,
      maxEmails: this.clampNumber(input.valueAsNumber, 1, 10000, settings.maxEmails),
    }));
  }

  protected draftTypeLabel(value: string): string {
    const draftTypes = this.copy().draftTypes;

    return draftTypes[value as keyof typeof draftTypes] ?? value;
  }

  protected configuredLabel(configured: boolean): string {
    return configured ? this.copy().values.configured : this.copy().values.notConfigured;
  }

  protected enabledLabel(enabled: boolean): string {
    return enabled ? this.copy().values.enabled : this.copy().values.disabled;
  }

  private syncEditableForms(
    settings: AdminSettings | null,
    supervision: AdminSettingsSupervision | null,
    system: AdminSettingsSystem | null,
  ): void {
    const supervisionSettings = this.recordFrom(supervision, ['settings']);
    const supervisionSystem = this.recordFrom(supervisionSettings, ['system']);
    const planningAutomation = this.recordFrom(supervisionSettings, ['planning_automation']);

    this.policy.set(
      this.policyFormFrom(
        this.firstRecord(
          [settings, supervision, supervisionSettings],
          ['policies', 'dashboard_policy', 'dashboard_policies'],
        ) ?? settings,
      ),
    );
    this.automation.set(
      this.automationFormFrom(
        this.firstRecord(
          [planningAutomation, settings, supervision, supervisionSettings],
          ['settings', 'planning_automation', 'automation'],
        ),
      ),
    );
    this.emailPipeline.set(
      this.emailPipelineFormFrom(
        this.firstRecord(
          [system, supervisionSystem, settings, supervision, supervisionSettings],
          ['email_pipeline', 'pipeline'],
        ),
      ),
    );
  }

  private policyPayload(): AdminDashboardPolicies {
    const policy = this.policy();

    return {
      review_threshold: policy.reviewWarningThreshold,
      audit_retention_days: policy.auditRetentionDays,
      support_email: policy.supportEmail,
    };
  }

  private automationPayload(): AdminPlanningAutomationSettings {
    const automation = this.automation();

    return {
      auto_run_after_import: automation.autoDraftGenerationAfterImport,
      default_email_type: automation.defaultDraftType,
      include_population: automation.includeParticipants,
      max_drafts_per_run: automation.maxDraftsPerRun,
    };
  }

  private emailPipelinePayload(): AdminEmailPipelineSettings {
    const pipeline = this.emailPipeline();

    return {
      enabled: pipeline.enabled,
      interval_minutes: pipeline.intervalMinutes,
      max_emails: pipeline.maxEmails,
    };
  }

  private policyFormFrom(source: unknown): PolicyForm {
    const defaults = this.defaultPolicySettings();

    return {
      reviewWarningThreshold: this.numberFrom(
        source,
        ['review_warning_threshold', 'reviewThreshold', 'review_threshold'],
        defaults.reviewWarningThreshold,
      ),
      auditRetentionDays: this.numberFrom(
        source,
        ['audit_retention_days', 'auditRetentionDays', 'retention_days'],
        defaults.auditRetentionDays,
      ),
      supportEmail:
        this.stringFrom(source, ['support_email', 'supportEmail']) || defaults.supportEmail,
    };
  }

  private automationFormFrom(source: unknown): AutomationForm {
    const defaults = this.defaultAutomationSettings();

    return {
      autoDraftGenerationAfterImport: this.booleanFrom(
        source,
        [
          'auto_draft_generation_after_import',
          'auto_run_after_import',
          'autoDraftGenerationAfterImport',
          'auto_draft',
        ],
        defaults.autoDraftGenerationAfterImport,
      ),
      defaultDraftType:
        this.stringFrom(source, ['default_draft_type', 'default_email_type', 'defaultDraftType']) ||
        defaults.defaultDraftType,
      includeParticipants: this.booleanFrom(
        source,
        ['include_participants', 'include_population', 'includeParticipants'],
        defaults.includeParticipants,
      ),
      maxDraftsPerRun: this.numberFrom(
        source,
        ['max_drafts_per_run', 'maxDraftsPerRun'],
        defaults.maxDraftsPerRun,
      ),
    };
  }

  private emailPipelineFormFrom(source: unknown): EmailPipelineForm {
    const defaults = this.defaultEmailPipelineSettings();

    return {
      enabled: this.booleanFrom(source, ['enabled'], defaults.enabled),
      intervalMinutes: this.numberFrom(
        source,
        ['interval_minutes', 'interval_seconds', 'intervalMinutes', 'interval'],
        defaults.intervalMinutes,
      ),
      maxEmails: this.numberFrom(
        source,
        ['max_emails', 'maxEmails', 'max_emails_per_run'],
        defaults.maxEmails,
      ),
    };
  }

  private defaultPolicySettings(): PolicyForm {
    return {
      reviewWarningThreshold: 40,
      auditRetentionDays: 180,
      supportEmail: 'dashboard.admin@tunisietelecom.tn',
    };
  }

  private defaultAutomationSettings(): AutomationForm {
    return {
      autoDraftGenerationAfterImport: false,
      defaultDraftType: 'standard',
      includeParticipants: true,
      maxDraftsPerRun: 250,
    };
  }

  private defaultEmailPipelineSettings(): EmailPipelineForm {
    return {
      enabled: true,
      intervalMinutes: 15,
      maxEmails: 100,
    };
  }

  private firstRecord(sources: unknown[], keys: string[]): Record<string, unknown> | null {
    for (const source of sources) {
      const record = this.recordFrom(source, keys);

      if (record) {
        return record;
      }
    }

    return null;
  }

  private settingsPayload<T>(source: unknown): T | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const record = source as Record<string, unknown>;
    const payload = record['settings'] ?? source;

    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as T)
      : null;
  }

  private recordFrom(source: unknown, keys: string[]): Record<string, unknown> | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }

    return null;
  }

  private valueFrom(source: unknown, keys: string[]): unknown {
    if (!source || typeof source !== 'object') {
      return undefined;
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null) {
        return record[key];
      }
    }

    return undefined;
  }

  private stringFrom(source: unknown, keys: string[]): string {
    const value = this.valueFrom(source, keys);

    return typeof value === 'string' ? value : '';
  }

  private numberFrom(source: unknown, keys: string[], fallback: number): number {
    const value = this.valueFrom(source, keys);

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && Number.isFinite(Number(value))) {
      return Number(value);
    }

    return fallback;
  }

  private booleanFrom(source: unknown, keys: string[], fallback = false): boolean {
    const value = this.valueFrom(source, keys);

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value === 'true' || value === 'configured' || value === 'enabled';
    }

    return fallback;
  }

  private listLabel(value: unknown): string {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : this.copy().values.missing;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);

      return entries.length > 0
        ? entries.map(([key, item]) => `${key}: ${String(item)}`).join(', ')
        : this.copy().values.missing;
    }

    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    return this.copy().values.missing;
  }

  private clampNumber(value: number, min: number, max: number, fallback: number): number {
    if (!Number.isFinite(value)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(value)));
  }

  private settingsFallback(error: unknown, endpointErrors: string[]) {
    endpointErrors.push(this.errorMessage(error, this.copy().errors.load));

    return of(null);
  }

  private flashSavedMessage(message: string): void {
    this.savedMessage.set(message);
    window.setTimeout(() => this.savedMessage.set(''), 2200);
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (isNetworkError(error)) {
      return this.copy().errors.network;
    }

    return backendErrorMessage(error, fallback);
  }
}
