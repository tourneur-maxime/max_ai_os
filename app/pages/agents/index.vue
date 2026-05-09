<template>
  <div class="page-content">
    <div class="two-col">
      <!-- Left column: agent list -->
      <div class="col-left">
        <div class="agents-list-header">
          <span class="page-title">Agents</span>
          <span class="count-badge">{{ agents.length }} / 12</span>
        </div>
        <div class="agents-search">
          <input v-model="search" type="text" class="input" placeholder="Search agents…" />
        </div>
        <div class="agents-list">
          <div
            v-for="ag in filteredAgents"
            :key="ag.name"
            :class="['agent-item', { selected: selectedName === ag.name }]"
            @click="selectedName = ag.name"
          >
            <div :class="['av', ag.cls]">{{ ag.av }}</div>
            <div class="agent-item-info">
              <div class="agent-item-name mono">{{ ag.name }}</div>
              <div class="agent-item-sub">{{ ag.model }}</div>
            </div>
            <div class="agent-item-right">
              <div class="agent-item-missions">{{ ag.missions }}</div>
              <span :class="['status-dot', ag.active ? 'active' : '']"></span>
            </div>
          </div>
        </div>
        <div class="agents-list-footer">
          <button class="btn primary" style="width:100%">+ New agent</button>
        </div>
      </div>

      <!-- Right column: agent form -->
      <div class="col-right" v-if="currentAgent">
        <div class="agent-form-wrap">
          <!-- Form header -->
          <div class="agent-form-header">
            <div :class="['av', 'xl', currentAgent.cls]">{{ currentAgent.av }}</div>
            <div>
              <div class="mono" style="font-size:15px;font-weight:700;color:var(--fg)">{{ currentAgent.name }}</div>
              <div style="font-size:11.5px;color:var(--fg-dim)">{{ currentAgent.sub || currentAgent.model + ' · ' + currentAgent.missions + ' missions' }}</div>
            </div>
            <span :class="['badge', currentAgent.active ? 'good' : '']" style="margin-left:auto">
              <span class="dot"></span>
              {{ currentAgent.active ? 'active' : 'idle' }}
            </span>
            <NuxtLink :to="`/agents/${currentAgent.name}/chat`" class="btn sm primary">Open chat →</NuxtLink>
          </div>

          <!-- IDENTITY -->
          <div class="section-title">Identity</div>
          <div class="form-group">
            <label class="label">Name</label>
            <input type="text" class="input mono" :value="currentAgent.name" />
          </div>
          <div class="form-group">
            <label class="label">System prompt</label>
            <textarea class="textarea mono" style="height:220px" :value="systemPrompts[currentAgent.name] || defaultPrompt"></textarea>
          </div>
          <div class="form-group">
            <label class="label">Working directory</label>
            <input type="text" class="input mono" :value="workingDirs[currentAgent.name] || '~/projects'" />
          </div>

          <!-- MODEL -->
          <div class="section-title">Model</div>
          <div class="form-row">
            <div class="form-group">
              <label class="label">Model</label>
              <select class="select" :value="currentAgent.model">
                <optgroup label="Anthropic">
                  <option>claude-opus-4</option>
                  <option>claude-sonnet-4.5</option>
                  <option>claude-haiku-4</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option>gpt-5</option>
                  <option>gpt-5-mini</option>
                  <option>gpt-4o</option>
                  <option>gpt-4o-mini</option>
                </optgroup>
              </select>
            </div>
            <div class="form-group" style="max-width:180px;">
              <label class="label">Plan Max</label>
              <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
                <label class="toggle">
                  <input type="checkbox" :checked="currentAgent.name === '_main'" />
                  <span class="slider"></span>
                </label>
                <span style="font-size:11.5px;color:var(--fg-dim)">Use plan max</span>
              </div>
            </div>
          </div>

          <!-- PERMISSIONS -->
          <div class="section-title">Permissions</div>
          <div class="form-group">
            <label class="label">Permission Mode</label>
            <div class="radio-group">
              <label v-for="perm in permModes" :key="perm.value" :class="['radio-item', { selected: selectedPerm === perm.value }]" @click="selectedPerm = perm.value">
                <input type="radio" name="perm" :value="perm.value" :checked="selectedPerm === perm.value" />
                <div>
                  <div class="radio-label">{{ perm.label }}</div>
                  <div class="radio-desc">{{ perm.desc }}</div>
                </div>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="label">Allowed tools</label>
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">
              <span v-for="t in allowedTools" :key="t" class="chip">{{ t }}<span class="x" @click="removeAllowed(t)">×</span></span>
              <button class="btn sm ghost" @click="addAllowed">+ Add</button>
            </div>
          </div>
          <div class="form-group">
            <label class="label">Denied tools</label>
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">
              <span v-for="t in deniedTools" :key="t" class="chip deny">{{ t }}<span class="x" @click="removeDenied(t)">×</span></span>
              <button class="btn sm ghost" @click="addDenied">+ Add</button>
            </div>
          </div>

          <!-- CHANNELS -->
          <div class="section-title">Channels</div>
          <div class="channel-list">
            <div class="channel-item">
              <div class="channel-icon">✈</div>
              <div class="channel-info">
                <div class="channel-name">Telegram</div>
                <div class="channel-sub">Send/receive messages</div>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="channels.telegram" />
                <span class="slider"></span>
              </label>
            </div>
            <div v-if="channels.telegram" class="channel-field">
              <input type="text" class="input mono" placeholder="Chat ID (e.g. -1001234567890)" />
            </div>
            <div class="channel-item">
              <div class="channel-icon">💬</div>
              <div class="channel-info">
                <div class="channel-name">WhatsApp</div>
                <div class="channel-sub">WhatsApp Business API</div>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="channels.whatsapp" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="channel-item">
              <div class="channel-icon">🔗</div>
              <div class="channel-info">
                <div class="channel-name">Webhook</div>
                <div class="channel-sub">HTTP POST on events</div>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="channels.webhook" />
                <span class="slider"></span>
              </label>
            </div>
            <div v-if="channels.webhook" class="channel-field">
              <input type="text" class="input mono" placeholder="https://hooks.example.com/…" />
            </div>
            <div class="channel-item">
              <div class="channel-icon">🟦</div>
              <div class="channel-info">
                <div class="channel-name">Teams</div>
                <div class="channel-sub">Microsoft Teams connector</div>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="channels.teams" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <!-- REMOTE CONTROL -->
          <div class="section-title">Remote control</div>
          <div class="form-group">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <label class="toggle">
                <input type="checkbox" v-model="remoteControl" />
                <span class="slider"></span>
              </label>
              <span style="font-size:12px;color:var(--fg-dim)">Enable remote control via tunnel</span>
            </div>
            <div v-if="remoteControl">
              <div class="form-group">
                <label class="label">Tunnel URL</label>
                <input type="text" class="input mono" value="https://maxos-main.trycloudflare.com" />
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <input type="text" class="input mono" value="sk-maxos-••••••••••••••" style="flex:1;" />
                <button class="btn sm">↻ Regenerate</button>
              </div>
              <div class="info-box">Remote control allows authorized clients to send tasks to this agent via the tunnel URL. Keep your token secret.</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="form-footer">
            <span class="save-status">{{ saveStatus }}</span>
            <div style="display:flex;gap:8px;">
              <NuxtLink :to="`/agents/${currentAgent.name}/chat`" class="btn sm">Open chat</NuxtLink>
              <button class="btn sm">Test prompt</button>
              <button class="btn sm primary" @click="handleSave">Save</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="col-right" style="display:flex;align-items:center;justify-content:center;color:var(--fg-dimmer);font-size:13px;">
        Select an agent to edit its config
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'default' })

const agents = [
  { name: '_main', model: 'gpt-5-mini', missions: 142, active: true, av: '_M', cls: 'salmon', sub: 'orchestrator · root agent · spawned 2d ago' },
  { name: 'researcher_42', model: 'gpt-5', missions: 38, active: true, av: 'R', cls: 'blue', sub: '' },
  { name: 'coder_07', model: 'claude-sonnet-4.5', missions: 67, active: true, av: 'C', cls: 'green', sub: '' },
  { name: 'reviewer_19', model: 'gpt-5-mini', missions: 24, active: false, av: 'Rv', cls: '', sub: '' },
  { name: 'memory_03', model: 'gpt-4o-mini', missions: 191, active: false, av: 'M', cls: 'purple', sub: '' },
  { name: 'shell_01', model: 'gpt-4o-mini', missions: 14, active: false, av: 'Sh', cls: '', sub: '' },
  { name: 'planner_04', model: 'claude-opus-4', missions: 9, active: false, av: 'Pl', cls: '', sub: '' },
]

const systemPrompts: Record<string, string> = {
  '_main': `You are Max OS — 1, a local-first agentic operating system.
You orchestrate other specialized agents to complete user goals.
You have access to: spawn_agent, assign_mission, monitor_agents, manage_memory.

Guidelines:
- Break complex goals into subtasks and delegate them
- Monitor ongoing missions and report status
- Consolidate results and present them clearly
- Always prefer local execution over cloud services`,
  'coder_07': `You are coder_07, a specialized coding agent.
You write, review, and refactor code across multiple languages.
You have access to: read_file, write_file, run_command, web_search.

Focus on: TypeScript, Python, React, Vue, and system scripts.
Always write clean, tested, and documented code.`,
}

const workingDirs: Record<string, string> = {
  '_main': '~/',
  'coder_07': '~/projects',
  'researcher_42': '~/research',
}

const defaultPrompt = `You are a specialized agent in the Max OS — 1 system.
Complete assigned tasks efficiently and report results clearly.`

const search = ref('')
const selectedName = ref('_main')
const selectedPerm = ref('auto')
const saveStatus = ref('')
const remoteControl = ref(true)
const channels = ref({ telegram: true, whatsapp: false, webhook: false, teams: false })

const allowedTools = ref(['read_file', 'write_file', 'run_command', 'web_search', 'spawn_agent'])
const deniedTools = ref(['delete_file', 'rm_rf'])

const permModes = [
  { value: 'auto', label: 'Auto', desc: 'Agent decides independently, no confirmations' },
  { value: 'acceptEdits', label: 'Accept Edits', desc: 'Prompt before any file modifications' },
  { value: 'plan', label: 'Plan', desc: 'Review and approve execution plan before running' },
  { value: 'bypassPermissions', label: 'Bypass', desc: 'Skip all permission checks (dangerous)' },
]

const filteredAgents = computed(() => {
  if (!search.value) return agents
  const q = search.value.toLowerCase()
  return agents.filter(a => a.name.toLowerCase().includes(q) || a.model.toLowerCase().includes(q))
})

const currentAgent = computed(() => agents.find(a => a.name === selectedName.value) || null)

function removeAllowed(t: string) { allowedTools.value = allowedTools.value.filter(x => x !== t) }
function removeDenied(t: string) { deniedTools.value = deniedTools.value.filter(x => x !== t) }
function addAllowed() {
  const t = prompt('Tool name:')
  if (t) allowedTools.value.push(t)
}
function addDenied() {
  const t = prompt('Tool name:')
  if (t) deniedTools.value.push(t)
}

function handleSave() {
  saveStatus.value = 'Saving…'
  setTimeout(() => { saveStatus.value = 'Saved ✓' }, 800)
  setTimeout(() => { saveStatus.value = '' }, 3000)
}
</script>

<style scoped>
.page-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.two-col {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.col-left {
  width: 340px;
  flex-shrink: 0;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.col-right {
  flex: 1;
  overflow-y: auto;
}

.agents-list-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.count-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--fg-dimmer);
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 2px 8px;
}
.agents-search {
  padding: 10px 12px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--line);
}
.agents-list {
  flex: 1;
  overflow-y: auto;
}
.agent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
  transition: background 0.12s;
}
.agent-item:hover { background: rgba(255,255,255,0.02); }
.agent-item.selected { background: var(--accent-softer); border-left: 2px solid var(--accent); }
.agent-item-info { flex: 1; min-width: 0; }
.agent-item-name { font-size: 12px; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.agent-item-sub { font-size: 10.5px; color: var(--fg-dimmer); margin-top: 2px; }
.agent-item-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.agent-item-missions { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--fg-dimmer); }
.status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--fg-dimmer);
}
.status-dot.active {
  background: var(--good);
  box-shadow: 0 0 5px var(--good-glow);
}
.agents-list-footer {
  padding: 12px 14px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}

.agent-form-wrap {
  padding: 20px 24px 40px;
}
.agent-form-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.channel-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.channel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 7px;
  border: 1px solid var(--line);
  margin-bottom: 4px;
}
.channel-icon { font-size: 14px; width: 22px; text-align: center; flex-shrink: 0; }
.channel-info { flex: 1; }
.channel-name { font-size: 12.5px; font-weight: 500; color: var(--fg); }
.channel-sub { font-size: 10.5px; color: var(--fg-dim); margin-top: 1px; }
.channel-field {
  padding: 0 12px 10px;
  margin-top: -4px;
  margin-bottom: 4px;
}
.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 0;
  border-top: 1px solid var(--line);
  margin-top: 24px;
  position: sticky;
  bottom: 0;
  background: var(--bg-1);
}
.save-status {
  font-size: 11.5px;
  color: var(--good);
  font-family: 'JetBrains Mono', monospace;
}
</style>
