export interface SystemHealthStatus {
  id: string;
  service: string;
  status: 'up' | 'degraded' | 'down';
  latencyMs: number;
  checkedAt: string;
  message?: string;
}
