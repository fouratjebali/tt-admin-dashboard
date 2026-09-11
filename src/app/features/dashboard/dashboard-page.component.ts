import { Component, computed, inject } from '@angular/core';
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
  LucideUpload,
} from '@lucide/angular';

import { PreferencesService } from '../../core/services/preferences.service';

const DASHBOARD_COPY = {
  en: {
    title: 'Operations overview',
    subtitle: 'Monitor mail planning, review load, and platform status from one clean workspace.',
    period: 'Today',
    refresh: 'Refresh',
    export: 'Export',
    importPlanning: 'Import planning',
    reviewDrafts: 'Review drafts',
    metrics: [
      { label: 'Drafts ready', value: '184', change: '+12.4%', tone: 'teal' },
      { label: 'Pending review', value: '18', change: '-6 from yesterday', tone: 'amber' },
      { label: 'Sent this week', value: '1,248', change: '+8.1%', tone: 'sage' },
      { label: 'Active admins', value: '9', change: '3 reviewers online', tone: 'blue' },
    ],
    pipelineTitle: 'Mail planning pipeline',
    pipelineSubtitle: 'Current import batch',
    pipeline: [
      { label: 'Imported', value: 100 },
      { label: 'Matched contacts', value: 82 },
      { label: 'Drafted', value: 71 },
      { label: 'Approved', value: 58 },
    ],
    queueTitle: 'Review queue',
    queueSubtitle: 'Priority sessions',
    queue: [
      {
        subject: 'Direction Centrale',
        owner: 'HR Operations',
        status: 'Needs review',
        time: '12 min',
      },
      { subject: 'Residence Nord', owner: 'Planning Team', status: 'Ready', time: '24 min' },
      { subject: 'Agence Tunis', owner: 'Mail Admin', status: 'Blocked', time: '41 min' },
    ],
    activityTitle: 'Recent activity',
    table: {
      action: 'Action',
      actor: 'Actor',
      target: 'Target',
      status: 'Status',
      time: 'Time',
    },
    activity: [
      {
        action: 'Planning import validated',
        actor: 'Senda M.',
        target: 'september-planning.xlsx',
        status: 'Complete',
        time: '09:42',
      },
      {
        action: 'Role updated',
        actor: 'Fourat J.',
        target: 'reviewer account',
        status: 'Audited',
        time: '08:18',
      },
      {
        action: 'Draft regenerated',
        actor: 'Islem B.',
        target: 'Residence Sud',
        status: 'Pending',
        time: 'Yesterday',
      },
    ],
    statusTitle: 'System status',
    status: [
      { label: 'Backend API', value: 'Healthy' },
      { label: 'Outlook connector', value: 'Operational' },
      { label: 'Database sync', value: 'Recent' },
    ],
  },
  fr: {
    title: 'Vue globale operations',
    subtitle:
      'Suivez le planning mail, la charge de revue et la sante plateforme dans un espace clair.',
    period: "Aujourd'hui",
    refresh: 'Actualiser',
    export: 'Exporter',
    importPlanning: 'Importer planning',
    reviewDrafts: 'Revoir drafts',
    metrics: [
      { label: 'Drafts prets', value: '184', change: '+12.4%', tone: 'teal' },
      { label: 'En revue', value: '18', change: '-6 depuis hier', tone: 'amber' },
      { label: 'Envoyes semaine', value: '1,248', change: '+8.1%', tone: 'sage' },
      { label: 'Admins actifs', value: '9', change: '3 reviewers online', tone: 'blue' },
    ],
    pipelineTitle: 'Pipeline planning mail',
    pipelineSubtitle: 'Import courant',
    pipeline: [
      { label: 'Importe', value: 100 },
      { label: 'Contacts matches', value: 82 },
      { label: 'Drafts crees', value: 71 },
      { label: 'Approuves', value: 58 },
    ],
    queueTitle: 'File de revue',
    queueSubtitle: 'Sessions prioritaires',
    queue: [
      { subject: 'Direction Centrale', owner: 'HR Operations', status: 'A revoir', time: '12 min' },
      { subject: 'Residence Nord', owner: 'Planning Team', status: 'Pret', time: '24 min' },
      { subject: 'Agence Tunis', owner: 'Mail Admin', status: 'Bloque', time: '41 min' },
    ],
    activityTitle: 'Activite recente',
    table: {
      action: 'Action',
      actor: 'Acteur',
      target: 'Cible',
      status: 'Statut',
      time: 'Heure',
    },
    activity: [
      {
        action: 'Import planning valide',
        actor: 'Senda M.',
        target: 'september-planning.xlsx',
        status: 'Termine',
        time: '09:42',
      },
      {
        action: 'Role mis a jour',
        actor: 'Fourat J.',
        target: 'compte reviewer',
        status: 'Audite',
        time: '08:18',
      },
      {
        action: 'Draft regenere',
        actor: 'Islem B.',
        target: 'Residence Sud',
        status: 'En attente',
        time: 'Hier',
      },
    ],
    statusTitle: 'Etat systeme',
    status: [
      { label: 'Backend API', value: 'Healthy' },
      { label: 'Connecteur Outlook', value: 'Operationnel' },
      { label: 'Sync database', value: 'Recente' },
    ],
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
    LucideUpload,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  private readonly preferences = inject(PreferencesService);
  protected readonly copy = computed(() => DASHBOARD_COPY[this.preferences.language()]);
}
