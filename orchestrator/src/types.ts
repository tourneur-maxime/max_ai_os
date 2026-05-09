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
  parent_mission_id?: string;
  callback_url?: string;
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

export interface Task {
  id: string;
  title: string;
  description?: string;
  agent_name?: string;
  status: 'backlog' | 'todo' | 'doing' | 'done';
  mission_id?: string;
  domain?: string;
  created_at: number;
  updated_at: number;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  command: string;
  agent_name?: string;
  category: string;
  source: string;
  active: number;
  yaml_def?: string;
  created_at: number;
}

export interface Schedule {
  id: string;
  name: string;
  agent_name: string;
  input_template: string;
  cron_expr: string;
  active: number;
  last_run_at?: number;
  last_mission_id?: string;
  created_at: number;
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
