export interface UserAccountSummary {
  id: string;
  fullName: string;
  email: string;
  department: string;
  status: 'active' | 'pending' | 'suspended';
  gmailConnected: boolean;
  agentsEnabled: boolean;
  lastActivityAt: string | null;
}
