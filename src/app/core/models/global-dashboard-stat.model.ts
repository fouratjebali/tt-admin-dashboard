export interface GlobalDashboardStat {
  period: string;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  processedEmails: number;
  flaggedEmails: number;
  healthyServices: number;
  degradedServices: number;
  downServices: number;
}
