<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <div class="page-title">Scheduler</div>
        <div class="page-sub">{{ schedules.length }} schedule{{ schedules.length !== 1 ? 's' : '' }}</div>
      </div>
      <div class="page-header-spacer"></div>
      <button class="btn primary" @click="openAdd">+ New schedule</button>
    </div>

    <div class="schedules-list">
      <div v-if="schedules.length === 0" class="empty-state">
        Aucun schedule. Créez une planification pour exécuter un agent automatiquement.
      </div>

      <div v-for="s in schedules" :key="s.id" class="schedule-card">
        <div class="schedule-header">
          <div class="schedule-toggle">
            <input type="checkbox" :checked="s.active === 1" @change="toggleActive(s)" class="toggle-cb" />
          </div>
          <div class="schedule-name">{{ s.name }}</div>
          <div class="cron-badge mono">{{ s.cron_expr }}</div>
          <div class="schedule-agent">→ <span class="mono">{{ s.agent_name }}</span></div>
          <div class="schedule-spacer"></div>
          <button class="btn sm" @click="runNow(s.id)" title="Déclencher maintenant">▶ Run now</button>
          <button class="btn sm" @click="openEdit(s)">Edit</button>
          <button class="btn sm bad" @click="deleteSchedule(s.id)">Delete</button>
        </div>

        <div class="schedule-meta">
          <span class="meta-item">
            <span class="meta-label">Dernière exécution :</span>
            <span>{{ s.last_run_at ? formatDate(s.last_run_at) : '—' }}</span>
          </span>
          <span v-if="s.last_mission_id" class="meta-item">
            <span class="meta-label">Dernière mission :</span>
            <NuxtLink to="/missions" class="mono mission-link">{{ s.last_mission_id }}</NuxtLink>
          </span>
        </div>

        <div class="schedule-input mono">{{ s.input_template.slice(0, 120) }}{{ s.input_template.length > 120 ? '…' : '' }}</div>
      </div>
    </div>

    <!-- Modal Add / Edit -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-header">
          <div class="modal-title">{{ editing ? `Éditer — ${form.name}` : 'Nouveau schedule' }}</div>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="field-group">
            <label class="field-label">Nom</label>
            <input v-model="form.name" type="text" class="input" placeholder="ex: rapport-quotidien" />
          </div>
          <div class="field-group">
            <label class="field-label">Agent</label>
            <select v-model="form.agent_name" class="input">
              <option v-for="a in agents" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Expression cron</label>
            <input v-model="form.cron_expr" type="text" class="input mono" placeholder="0 9 * * 1-5" />
            <div class="field-hint">Format : <span class="mono">minute heure jour mois jour-semaine</span> — ex: <span class="mono">0 9 * * 1-5</span> = lundi-vendredi à 9h</div>
          </div>
          <div class="field-group">
            <label class="field-label">Input template</label>
            <textarea v-model="form.input_template" class="textarea" rows="4" placeholder="Décris la tâche à exécuter…"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeModal">Annuler</button>
          <button class="btn primary" @click="saveSchedule" :disabled="!form.name || !form.agent_name || !form.cron_expr || !form.input_template">
            {{ editing ? 'Mettre à jour' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'default' })

const { $fetch } = useApi()

interface Schedule {
  id: string
  name: string
  agent_name: string
  input_template: string
  cron_expr: string
  active: number
  last_run_at?: number
  last_mission_id?: string
  created_at: number
}

const schedules = ref<Schedule[]>([])
const agents = ref<string[]>([])
const showModal = ref(false)
const editing = ref<string | null>(null)

const form = ref({
  name: '',
  agent_name: '',
  input_template: '',
  cron_expr: '0 9 * * 1-5',
})

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

async function fetchSchedules() {
  schedules.value = await $fetch<Schedule[]>('/api/schedules')
}

async function fetchAgents() {
  const list = await $fetch<{ name: string }[]>('/api/agents')
  agents.value = list.map(a => a.name)
}

function openAdd() {
  editing.value = null
  form.value = { name: '', agent_name: agents.value[0] ?? '_main', input_template: '', cron_expr: '0 9 * * 1-5' }
  showModal.value = true
}

function openEdit(s: Schedule) {
  editing.value = s.id
  form.value = { name: s.name, agent_name: s.agent_name, input_template: s.input_template, cron_expr: s.cron_expr }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
}

async function saveSchedule() {
  const body = { ...form.value }
  if (editing.value) {
    await $fetch(`/api/schedules/${editing.value}`, { method: 'PUT', body: JSON.stringify(body) })
  } else {
    await $fetch('/api/schedules', { method: 'POST', body: JSON.stringify(body) })
  }
  closeModal()
  await fetchSchedules()
}

async function deleteSchedule(id: string) {
  await $fetch(`/api/schedules/${id}`, { method: 'DELETE' })
  await fetchSchedules()
}

async function toggleActive(s: Schedule) {
  await $fetch(`/api/schedules/${s.id}`, { method: 'PUT', body: JSON.stringify({ active: s.active === 1 ? 0 : 1 }) })
  await fetchSchedules()
}

async function runNow(id: string) {
  await $fetch(`/api/schedules/${id}/run`, { method: 'POST' })
}

onMounted(async () => {
  await Promise.all([fetchSchedules(), fetchAgents()])
})
</script>

<style scoped>
.page-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.page-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid var(--line); flex-shrink: 0;
}
.page-header-spacer { flex: 1; }
.schedules-list { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.empty-state { color: var(--fg-dimmer); font-size: 13px; padding: 40px; text-align: center; }

.schedule-card {
  background: var(--bg-1); border: 1px solid var(--line); border-radius: 10px;
  padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;
}
.schedule-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.schedule-name { font-size: 13px; font-weight: 600; color: var(--fg); }
.schedule-agent { font-size: 11.5px; color: var(--fg-dim); }
.schedule-spacer { flex: 1; }
.cron-badge {
  font-size: 10.5px; padding: 2px 8px; border-radius: 4px;
  background: rgba(255,255,255,0.05); border: 1px solid var(--line); color: var(--accent);
}
.schedule-meta { display: flex; gap: 16px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--fg-dim); }
.meta-label { color: var(--fg-dimmer); }
.schedule-input {
  font-size: 11px; color: var(--fg-dimmer);
  background: rgba(255,255,255,0.02); border: 1px solid var(--line);
  border-radius: 5px; padding: 6px 10px;
}
.mission-link { color: var(--accent); text-decoration: none; font-size: 10.5px; }
.mission-link:hover { text-decoration: underline; }
.toggle-cb { accent-color: var(--accent); cursor: pointer; width: 16px; height: 16px; }

.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: var(--bg-1); border: 1px solid var(--line); border-radius: 12px;
  width: 100%; max-width: 500px; display: flex; flex-direction: column;
}
.modal-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border-bottom: 1px solid var(--line);
}
.modal-title { font-size: 14px; font-weight: 600; color: var(--fg); flex: 1; }
.modal-close {
  background: none; border: none; color: var(--fg-dimmer); cursor: pointer; font-size: 16px; padding: 0;
}
.modal-close:hover { color: var(--fg); }
.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 18px; border-top: 1px solid var(--line);
}
.field-group { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 11.5px; color: var(--fg-dim); font-weight: 500; }
.field-hint { font-size: 11px; color: var(--fg-dimmer); margin-top: 3px; }
.btn.bad { color: var(--bad); border-color: rgba(255,90,90,0.3); }
.btn.bad:hover { background: rgba(255,90,90,0.08); }
</style>
