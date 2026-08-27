export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
