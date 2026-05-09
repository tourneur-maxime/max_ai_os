<template>
  <div class="page-content">
    <div class="two-col">
      <!-- Left column: agent list -->
      <div class="col-left">
        <div class="agents-list-header">
          <span class="page-title">Agents</span>
          <span class="count-badge">{{ agents.length }} agents</span>
        </div>
        <div class="agents-search">
          <input v-model="search" type="text" class="input" placeholder="Search agents…" />
        </div>
        <div class="agents-list">
          <div
            v-for="ag in filteredAgents"
            :key="ag.name"
            :class="['agent-item', { selected: selectedName === ag.name }]"
            @click="selectAgent(ag.name)"
          >
            <div :class="['av', agentClass(ag.name)]">{{ agentAvatar(ag.name) }}</div>
            <div class="agent-item-info">
              <div class="agent-item-name mono">{{ ag.name }}</div>
              <div class="agent-item-sub">{{ ag.model }}</div>
            </div>
            <div class="agent-item-right">
              <span class="status-dot"></span>
            </div>
          </div>
        </div>
        <div class="agents-list-footer">
          <button class="btn primary" style="width:100%" @click="showNewAgent = true">+ New agent</button>
        </div>
      </div>

      <!-- Right column: agent form -->
      <div class="col-right" v-if="currentAgent">
        <div class="agent-form-wrap">
          <!-- Form header -->
          <div class="agent-form-header">
            <div :class="['av', 'xl', agentClass(currentAgent.name)]">{{ agentAvatar(currentAgent.name) }}</div>
            <div>
              <div class="mono" style="font-size:15px;font-weight:700;color:var(--fg)">{{ currentAgent.name }}</div>
              <div style="font-size:11.5px;color:var(--fg-dim)">{{ currentAgent.model }}</div>
            </div>
            <NuxtLink :to="`/agents/${currentAgent.name}/chat`" class="btn sm primary" style="margin-left:auto">Open chat →</NuxtLink>
          </div>

          <!-- IDENTITY -->
          <div class="section-title">Identity</div>
          <div class="form-group">
            <label class="label">Name</label>
            <input type="text" class="input mono" v-model="form.name" />
          </div>
          <div class="form-group">
            <label class="label">System prompt</label>
            <textarea class="textarea mono" style="height:220px" v-model="form.systemPrompt"></textarea>
          </div>
          <div class="form-group">
            <label class="label">Working directory</label>
            <input type="text" class="input mono" v-model="form.cwd" />
          </div>

          <!-- MODEL -->
          <div class="section-title">Model</div>
          <div class="form-row">
            <div class="form-group">
              <label class="label">Model</label>
              <select class="select" v-model="form.model">
                <optgroup label="Anthropic">
                  <option value="claude-opus-4-7">claude-opus-4-7</option>
                  <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                  <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
                </optgroup>
              </select>
            </div>
          </div>

          <!-- PERMISSIONS -->
          <div class="section-title">Permissions</div>
          <div class="form-group">
            <label class="label">Permission Mode</label>
            <div class="radio-group">
              <label v-for="perm in permModes" :key="perm.value" :class="['radio-item', { selected: form.permissionMode === perm.value }]" @click="form.permissionMode = perm.value">
                <input type="radio" name="perm" :value="perm.value" :checked="form.permissionMode === perm.value" />
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
              <span v-for="t in form.allowedTools" :key="t" class="chip">{{ t }}<span class="x" @click="removeAllowed(t)">×</span></span>
              <button class="btn sm ghost" @click="promptAddAllowed">+ Add</button>
            </div>
          </div>
          <div class="form-group">
            <label class="label">Denied tools</label>
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">
              <span v-for="t in form.deniedTools" :key="t" class="chip deny">{{ t }}<span class="x" @click="removeDenied(t)">×</span></span>
              <button class="btn sm ghost" @click="promptAddDenied">+ Add</button>
            </div>
          </div>

          <!-- Footer -->
          <div class="form-footer">
            <span class="save-status">{{ saveStatus }}</span>
            <div style="display:flex;gap:8px;">
              <button class="btn sm bad" @click="deleteAgent">Delete</button>
              <NuxtLink :to="`/agents/${currentAgent.name}/chat`" class="btn sm">Open chat</NuxtLink>
              <button class="btn sm primary" @click="handleSave">Save</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="col-right" style="display:flex;align-items:center;justify-content:center;color:var(--fg-dimmer);font-size:13px;">
        Sélectionne un agent pour éditer sa configuration
      </div>
    </div>

    <!-- New agent modal -->
    <div v-if="showNewAgent" class="modal-overlay" @click.self="showNewAgent = false">
      <div class="modal" style="width:420px;">
        <div class="modal-header">
          <div style="font-size:14px;font-weight:600;">Nouvel agent</div>
          <button class="modal-close" @click="showNewAgent = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="label">Nom (snake_case)</label>
            <input type="text" class="input mono" v-model="newAgentName" placeholder="ex: coder_01" />
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn primary" @click="createAgent">Créer</button>
            <button class="btn ghost" @click="showNewAgent = false">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'

definePageMeta({ layout: 'default' })

const { $fetch } = useApi()

interface Agent {
  name: string
  cwd: string
  model: string
  permissionMode: string
  allowedTools: string[]
  deniedTools: string[]
}

const agents = ref<Agent[]>([])
const search = ref('')
const selectedName = ref<string | null>(null)
const saveStatus = ref('')
const showNewAgent = ref(false)
const newAgentName = ref('')
const systemPrompts: Record<string, string> = {}

const form = reactive({
  name: '',
  cwd: '',
  model: 'claude-sonnet-4-6',
  permissionMode: 'acceptEdits',
  allowedTools: [] as string[],
  deniedTools: [] as string[],
  systemPrompt: '',
})

const permModes = [
  { value: 'auto', label: 'Auto', desc: 'Agent decides independently, no confirmations' },
  { value: 'acceptEdits', label: 'Accept Edits', desc: 'Prompt before any file modifications' },
  { value: 'plan', label: 'Plan', desc: 'Review and approve execution plan before running' },
  { value: 'bypassPermissions', label: 'Bypass', desc: 'Skip all permission checks (dangerous)' },
]

function agentAvatar(name: string): string {
  if (name === '_main') return '_M'
  const parts = name.split('_')
  return parts[0].slice(0, 2).toUpperCase()
}

function agentClass(name: string): string {
  if (name === '_main') return 'salmon'
  if (name.startsWith('coder')) return 'green'
  if (name.startsWith('researcher')) return 'blue'
  if (name.startsWith('memory')) return 'purple'
  return ''
}

const filteredAgents = computed(() => {
  if (!search.value) return agents.value
  const q = search.value.toLowerCase()
  return agents.value.filter(a => a.name.toLowerCase().includes(q) || a.model.toLowerCase().includes(q))
})

const currentAgent = computed(() => agents.value.find(a => a.name === selectedName.value) ?? null)

async function fetchAgents() {
  agents.value = await $fetch<Agent[]>('/api/agents')
}

async function selectAgent(name: string) {
  selectedName.value = name
  const agent = agents.value.find(a => a.name === name)
  if (!agent) return
  form.name = agent.name
  form.cwd = agent.cwd
  form.model = agent.model
  form.permissionMode = agent.permissionMode
  form.allowedTools = [...agent.allowedTools]
  form.deniedTools = [...agent.deniedTools]

  if (!systemPrompts[name]) {
    try {
      const { content } = await $fetch<{ content: string }>(`/api/agents/${name}/system-prompt`)
      systemPrompts[name] = content
    } catch { systemPrompts[name] = '' }
  }
  form.systemPrompt = systemPrompts[name] ?? ''
}

async function handleSave() {
  if (!selectedName.value) return
  saveStatus.value = 'Saving…'
  try {
    await $fetch(`/api/agents/${selectedName.value}/config`, {
      method: 'PUT',
      body: JSON.stringify({
        config: {
          name: form.name,
          cwd: form.cwd,
          model: form.model,
          permissionMode: form.permissionMode,
          allowedTools: form.allowedTools,
          deniedTools: form.deniedTools,
        },
        systemPrompt: form.systemPrompt,
      }),
    })
    saveStatus.value = 'Saved ✓'
    await fetchAgents()
  } catch (e: unknown) {
    saveStatus.value = 'Error: ' + (e as Error).message
  }
  setTimeout(() => { saveStatus.value = '' }, 3000)
}

async function deleteAgent() {
  if (!selectedName.value) return
  if (!confirm(`Supprimer l'agent ${selectedName.value} ?`)) return
  await $fetch(`/api/agents/${selectedName.value}`, { method: 'DELETE' })
  selectedName.value = null
  await fetchAgents()
}

async function createAgent() {
  const name = newAgentName.value.trim()
  if (!name) return
  await $fetch(`/api/agents/${name}/config`, {
    method: 'PUT',
    body: JSON.stringify({
      config: {
        name,
        cwd: `~/${name}`,
        model: 'claude-sonnet-4-6',
        permissionMode: 'acceptEdits',
        allowedTools: ['bash', 'read_file', 'write_file'],
        deniedTools: [],
      },
      systemPrompt: `You are ${name}, a specialized agent in the Max OS — 1 system.\nComplete assigned tasks efficiently and report results clearly.`,
    }),
  })
  showNewAgent.value = false
  newAgentName.value = ''
  await fetchAgents()
  selectAgent(name)
}

function removeAllowed(t: string) { form.allowedTools = form.allowedTools.filter(x => x !== t) }
function removeDenied(t: string) { form.deniedTools = form.deniedTools.filter(x => x !== t) }
function promptAddAllowed() {
  const t = prompt('Tool name:')
  if (t) form.allowedTools.push(t)
}
function promptAddDenied() {
  const t = prompt('Tool name:')
  if (t) form.deniedTools.push(t)
}

onMounted(async () => {
  await fetchAgents()
  if (agents.value.length > 0) selectAgent(agents.value[0].name)
})
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
.status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--fg-dimmer);
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
