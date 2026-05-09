<template>
  <div class="page-content">
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">Missions</div>
        <div class="page-sub">All agent missions · {{ missions.length }} au total</div>
      </div>
    </div>

    <!-- Stats row -->
    <div class="stats-band">
      <div class="stat-card">
        <div class="stat-value">{{ missions.length }}</div>
        <div class="stat-label">Missions totales</div>
      </div>
      <div class="stat-card featured">
        <div class="stat-value">{{ formatCost(totalCost) }}</div>
        <div class="stat-label">Coût total</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatTokens(null, totalTokens) }}</div>
        <div class="stat-label">Tokens utilisés</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ missions.filter(m => m.status === 'running').length }}</div>
        <div class="stat-label">En cours</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-band">
      <div class="filter-pills">
        <button v-for="f in filters" :key="f" :class="['filter-pill', { active: activeFilter === f }]" @click="activeFilter = f">{{ f }}</button>
      </div>
      <input v-model="search" type="text" class="input" style="width:220px;" placeholder="Search missions…" />
    </div>

    <!-- Main content: table + panel -->
    <div class="missions-body">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Mission</th>
              <th>Agent</th>
              <th>Démarré</th>
              <th>Durée</th>
              <th>Coût</th>
              <th>Tokens</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in filteredMissions"
              :key="m.id"
              :class="{ selected: selectedId === m.id }"
              @click="selectMission(m)"
              style="cursor:pointer"
            >
              <td class="mono" style="color:var(--fg-dimmer);font-size:10.5px;">{{ m.id }}</td>
              <td style="color:var(--fg);font-size:12.5px;max-width:280px;">{{ m.title }}</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span :class="['av', m.agentCls]" style="width:18px;height:18px;font-size:8px;">{{ m.agentAv }}</span>
                  <span class="mono" style="font-size:11px;">{{ m.agent_name }}</span>
                </div>
              </td>
              <td class="mono" style="font-size:11px;color:var(--fg-dim)">{{ m.started }}</td>
              <td class="mono" style="font-size:11px;color:var(--fg-dim)">{{ m.duration }}</td>
              <td class="mono" style="font-size:11px;color:var(--accent)">{{ m.cost }}</td>
              <td class="mono" style="font-size:11px;color:var(--fg-dim)">{{ m.tokens }}</td>
              <td>
                <span :class="['badge', m.statusCls]">
                  <span class="dot"></span>
                  {{ m.status }}
                </span>
              </td>
              <td>
                <button v-if="m.status === 'running'" class="btn sm" style="padding:2px 8px;font-size:10px;" @click.stop="killMission(m.id)">Kill</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="missions.length === 0" style="padding:40px;text-align:center;color:var(--fg-dimmer);font-size:13px;">
          Aucune mission. Lance un agent pour commencer.
        </div>
      </div>

      <!-- Detail panel -->
      <div :class="['slideover', { open: !!selectedMission }]">
        <div v-if="selectedMission" class="slideover-header">
          <div :class="['av', 'lg', selectedMission.agentCls]">{{ selectedMission.agentAv }}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ selectedMission.title }}</div>
            <div class="mono" style="font-size:10.5px;color:var(--fg-dimmer)">{{ selectedMission.id }}</div>
          </div>
          <span :class="['badge', selectedMission.statusCls]">
            <span class="dot"></span>
            {{ selectedMission.status }}
          </span>
          <button class="modal-close" @click="selectedId = null">✕</button>
        </div>
        <div v-if="selectedMission" class="slideover-body">
          <!-- Mini stats -->
          <div class="stat-row" style="margin-bottom:16px;">
            <div class="stat-card" style="flex:none;padding:10px 14px;">
              <div class="stat-value" style="font-size:16px;">{{ selectedMission.cost }}</div>
              <div class="stat-label">Cost</div>
            </div>
            <div class="stat-card" style="flex:none;padding:10px 14px;">
              <div class="stat-value" style="font-size:16px;">{{ selectedMission.tokens }}</div>
              <div class="stat-label">Tokens</div>
            </div>
            <div class="stat-card" style="flex:none;padding:10px 14px;">
              <div class="stat-value" style="font-size:16px;">{{ selectedMission.duration }}</div>
              <div class="stat-label">Duration</div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs-header">
            <button v-for="t in tabs" :key="t" :class="['tab-btn', { active: activeTab === t }]" @click="activeTab = t">{{ t }}</button>
          </div>

          <div style="margin-top:16px;">
            <!-- Timeline tab -->
            <div v-if="activeTab === 'Timeline'" class="timeline">
              <div v-if="parsedEvents.length === 0" style="color:var(--fg-dimmer);font-size:12px;">Aucun événement.</div>
              <div v-for="ev in parsedEvents" :key="ev.time + ev.msg + ev.typeLabel" class="timeline-event">
                <div :class="['tl-dot', ev.type]"></div>
                <div class="tl-content">
                  <div class="tl-time mono">{{ ev.time }}</div>
                  <div class="tl-type">{{ ev.typeLabel }}</div>
                  <div class="tl-msg">{{ ev.msg }}</div>
                </div>
              </div>
            </div>

            <!-- Output tab -->
            <div v-if="activeTab === 'Output'" class="mission-output">
              <div v-html="selectedMission.output"></div>
            </div>

            <!-- Logs tab -->
            <div v-if="activeTab === 'Logs'" class="code-block" style="font-size:11px;">{{ selectedMission.logs }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

definePageMeta({ layout: 'default' })

const { $fetch, useSSE } = useApi()

interface RawMission {
  id: string
  agent_name: string
  input: string
  status: string
  source_channel: string | null
  created_at: number
  finished_at: number | null
  cost_usd: number | null
  tokens_in: number | null
  tokens_out: number | null
}

interface RawEvent {
  id: number
  mission_id: string
  type: string
  timestamp: number
  payload: string
}

const missions = ref<RawMission[]>([])
const search = ref('')
const activeFilter = ref('All')
const selectedId = ref<string | null>(null)
const activeTab = ref('Timeline')
const missionEvents = ref<RawEvent[]>([])
const missionOutput = ref<string | null>(null)
let sseClose: (() => void) | null = null

const filters = ['All', 'Active', 'Done', 'Failed']
const tabs = ['Timeline', 'Output', 'Logs']

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

function formatTs(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
}

function formatDur(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

function formatCost(usd: number | null): string {
  if (!usd) return '—'
  return `$${usd.toFixed(3)}`
}

function formatTokens(_a: number | null, total: number | null): string {
  const t = total ?? 0
  if (t >= 1_000_000) return `${(t / 1_000_000).toFixed(1)}M`
  if (t >= 1000) return `${Math.round(t / 1000)}k`
  return String(t)
}

function statusClass(status: string): string {
  if (status === 'done') return 'good'
  if (status === 'running') return 'accent'
  if (status === 'failed') return 'bad'
  return 'warn'
}

const totalCost = computed(() => missions.value.reduce((acc, m) => acc + (m.cost_usd ?? 0), 0))
const totalTokens = computed(() => missions.value.reduce((acc, m) => acc + (m.tokens_in ?? 0) + (m.tokens_out ?? 0), 0))

const displayMissions = computed(() => missions.value.map(m => ({
  ...m,
  title: m.input.length > 65 ? m.input.slice(0, 65) + '…' : m.input,
  agentAv: agentAvatar(m.agent_name),
  agentCls: agentClass(m.agent_name),
  started: formatTs(m.created_at),
  duration: m.finished_at ? formatDur(m.finished_at - m.created_at) : (m.status === 'running' ? '…' : '—'),
  cost: formatCost(m.cost_usd),
  tokens: formatTokens(null, (m.tokens_in ?? 0) + (m.tokens_out ?? 0)),
  statusCls: statusClass(m.status),
})))

const filteredMissions = computed(() => {
  let ms = displayMissions.value
  if (activeFilter.value !== 'All') {
    const map: Record<string, string> = { 'Active': 'running', 'Done': 'done', 'Failed': 'failed' }
    ms = ms.filter(m => m.status === map[activeFilter.value])
  }
  if (search.value) {
    const q = search.value.toLowerCase()
    ms = ms.filter(m => m.title.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.agent_name.toLowerCase().includes(q))
  }
  return ms
})

const parsedEvents = computed(() => missionEvents.value.map(ev => {
  const time = new Date(ev.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  let payload: Record<string, unknown> = {}
  try { payload = JSON.parse(ev.payload) } catch { /* ignore */ }

  if (ev.type === 'assistant') {
    const content = (payload.message as { content?: { type: string; text?: string; name?: string }[] })?.content ?? []
    const toolUse = content.find(b => b.type === 'tool_use')
    if (toolUse) return { type: 'pre', typeLabel: 'ToolUse', time, msg: toolUse.name ?? '' }
    const text = content.find(b => b.type === 'text')
    return { type: 'post', typeLabel: 'Assistant', time, msg: ((text?.text ?? '') as string).slice(0, 100) }
  }
  if (ev.type === 'user') {
    const content = (payload.message as { content?: { type: string; content?: unknown }[] })?.content ?? []
    const tr = content.find(b => b.type === 'tool_result')
    return { type: 'post', typeLabel: 'ToolResult', time, msg: String(tr?.content ?? '').slice(0, 100) }
  }
  if (ev.type === 'result') {
    return { type: 'stop', typeLabel: 'Result', time, msg: (payload.subtype as string) ?? 'success' }
  }
  return { type: 'pre', typeLabel: ev.type, time, msg: '' }
}))

const selectedMission = computed(() => {
  if (!selectedId.value) return null
  const base = displayMissions.value.find(m => m.id === selectedId.value)
  if (!base) return null
  return {
    ...base,
    events: parsedEvents.value,
    output: missionOutput.value
      ? `<p style="white-space:pre-wrap">${missionOutput.value.replace(/</g, '&lt;')}</p>`
      : '<p style="color:var(--fg-dimmer)">Pas encore de résultat.</p>',
    logs: JSON.stringify({
      id: base.id, agent: base.agent_name,
      cost_usd: base.cost_usd, tokens_in: base.tokens_in, tokens_out: base.tokens_out,
      status: base.status, created_at: base.created_at, finished_at: base.finished_at,
    }, null, 2),
  }
})

async function fetchMissions() {
  missions.value = await $fetch<RawMission[]>('/api/missions')
}

async function fetchMissionDetail(id: string) {
  try {
    const { events } = await $fetch<{ mission: RawMission; events: RawEvent[] }>(`/api/missions/${id}`)
    missionEvents.value = events
    const { output } = await $fetch<{ output: string | null }>(`/api/missions/${id}/output`)
    missionOutput.value = output
  } catch { /* ignore */ }
}

async function killMission(id: string) {
  await $fetch(`/api/missions/${id}`, { method: 'DELETE' })
  await fetchMissions()
  if (selectedId.value === id) selectedId.value = null
}

function selectMission(m: { id: string }) {
  selectedId.value = m.id
  activeTab.value = 'Timeline'
}

watch(selectedId, async (id) => {
  if (sseClose) { sseClose(); sseClose = null }
  missionEvents.value = []
  missionOutput.value = null
  if (!id) return
  await fetchMissionDetail(id)

  const m = missions.value.find(x => x.id === id)
  if (m?.status === 'running') {
    sseClose = useSSE(`/api/missions/${id}/stream`, async (data) => {
      if (data.type === 'mission_complete') {
        await fetchMissions()
        await fetchMissionDetail(id)
        if (sseClose) { sseClose(); sseClose = null }
      } else {
        missionEvents.value.push({
          id: Date.now(),
          mission_id: id,
          type: data.type as string,
          timestamp: (data.timestamp as number) ?? Date.now(),
          payload: JSON.stringify(data),
        })
      }
    })
  }
})

let pollInterval: ReturnType<typeof setInterval>

onMounted(async () => {
  await fetchMissions()
  pollInterval = setInterval(fetchMissions, 5000)
})

onUnmounted(() => {
  clearInterval(pollInterval)
  if (sseClose) sseClose()
})
</script>

<style scoped>
.page-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.stats-band {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.stats-band .stat-card {
  padding: 10px 16px;
}
.filters-band {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.missions-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
}
.table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}
.page-header {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 20px;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: var(--line);
}
.timeline-event {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  position: relative;
}
.tl-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 3px;
  position: absolute;
  left: -20px;
  border: 2px solid var(--bg-1);
}
.tl-dot.pre { background: var(--info); }
.tl-dot.post { background: var(--good); }
.tl-dot.stop { background: var(--warn); }
.tl-dot.spawn { background: var(--accent); }
.tl-content { flex: 1; }
.tl-time { font-size: 10px; color: var(--fg-dimmer); margin-bottom: 1px; }
.tl-type { font-size: 11px; font-weight: 600; color: var(--fg); }
.tl-msg { font-size: 11.5px; color: var(--fg-dim); margin-top: 1px; }
.mission-output {
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg-dim);
}
.mission-output :deep(h3) { font-size: 13px; font-weight: 600; color: var(--fg); margin: 0 0 8px; }
.mission-output :deep(p) { margin: 0 0 8px; }
.mission-output :deep(code) { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; background: rgba(255,255,255,0.07); padding: 1px 5px; border-radius: 3px; color: var(--accent); }
</style>
