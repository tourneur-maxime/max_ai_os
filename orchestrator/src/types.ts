export interface Agent {
  name: string;
  cwd: string;
  model: string;
  permissionMode: 'auto' | 'acceptEdits' | 'plan' | 'bypassPermissions';
  allowedTools: string[];
  deniedTools: string[];
}

export interface Mission {
  id: string;
  agent_name: string;
  input: string;
  status: 'running' | 'done' | 'failed';
  source_channel?: string;
  created_at: number;
  finished_at?: number;
  cost_usd?: number;
  tokens_in?: number;
  tokens_out?: number;
}

export interface StreamEvent {
  missionId: string;
  type: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface ChannelConfig {
  type: 'telegram' | 'webhook' | 'teams';
  defaultAgent: string;
  agentRouting?: Record<string, string>;
  botTokenEnv?: string;
  webhookSecret?: string;
  allowedChatIds?: number[];
}

export interface RemoteToken {
  id: string;
  client_name: string;
  token: string;
  created_at: number;
  expires_at: number;
  call_count: number;
  last_called_at?: number;
}
