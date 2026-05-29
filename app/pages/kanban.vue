<template>
  <div class="page-content">
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">Kanban</div>
        <div class="page-sub">Board de tâches</div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:10px;">
        <div class="filter-pills">
          <button v-for="ag in ['All', ...agentNames]" :key="ag" :class="['filter-pill', { active: activeAgent === ag }]" @click="activeAgent = ag">{{ ag }}</button>
        </div>
      </div>
    </div>

    <!-- Board -->
    <div class="kanban-board">
      <div v-for="col in columns" :key="col.id" class="kanban-col">
        <div class="kanban-col-header">
          <span :class="['col-dot', col.id]"></span>
          <span :style="{ color: col.color }">{{ col.title }}</span>
          <span class="kanban-col-count">{{ getCards(col.id).length }}</span>
        </div>

        <div
          class="kanban-drop-zone-area"
          @dragover.prevent="dragOverCol = col.id"
          @dragleave="dragOverCol = null"
          @drop="onDrop(col.id)"
          :class="{ 'drag-over': dragOverCol === col.id }"
        >
          <div
            v-for="card in getCards(col.id)"
            :key="card.id"
            :class="['kanban-card', { 'active-card': card.status === 'doing' }]"
            draggable="true"
            @dragstart="onDragStart(card)"
            @dragend="dragOverCol = null"
          >
            <div class="kanban-card-id">{{ card.id }}</div>
            <div class="kanban-card-title">{{ card.title }}</div>
            <div v-if="card.status === 'doing'" class="progress-bar" style="margin-bottom:8px;">
              <div class="fill" style="width:50%;background:var(--accent)"></div>
            </div>
            <div class="kanban-card-footer">
              <span :class="['domain-tag', card.domain]">{{ card.domain }}</span>
              <div v-if="card.agent_name" style="display:flex;align-items:center;gap:5px;margin-left:4px;">
                <span :class="['av', agentClass(card.agent_name)]" style="width:16px;height:16px;font-size:7px;">{{ agentAvatar(card.agent_name) }}</span>
                <span class="mono" style="font-size:10px;color:var(--fg-dimmer)">{{ card.agent_name }}</span>
              </div>
              <button v-if="card.status === 'todo'" class="btn sm" style="margin-left:auto;padding:1px 7px;font-size:10px;" @click.stop="spawnTask(card)">▶ Spawn</button>
            </div>
          </div>

          <div v-if="getCards(col.id).length === 0" class="kanban-drop-zone">
            <span>Drop here</span>
          </div>
        </div>

        <button class="btn sm ghost" style="width:100%;margin-top:6px;color:var(--fg-dimmer)" @click="newTaskCol = col.id; showNewTask = true">+ Add card</button>
      </div>
    </div>

    <!-- New task modal -->
    <div v-if="showNewTask" class="modal-overlay" @click.self="showNewTask = false">
      <div class="modal" style="width:420px;">
        <div class="modal-header">
          <div style="font-size:14px;font-weight:600;">New task</div>
          <button class="modal-close" @click="showNewTask = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="label">Title</label>
            <input type="text" class="input" v-model="newTaskTitle" placeholder="Task description…" />
          </div>
          <div class="form-group">
            <label class="label">Agent</label>
            <select class="select" v-model="newTaskAgent">
              <option value="">— none —</option>
              <option v-for="a in agentNames" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label">Domain</label>
            <select class="select" v-model="newTaskDomain">
              <option>dev</option>
              <option>research</option>
              <option>content</option>
              <option>ops</option>
              <option>product</option>
              <option>loyalty</option>
            </select>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn primary" @click="createTask">Create</button>
            <button class="btn ghost" @click="showNewTask = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'default' })

const { $fetch } = useApi()

interface Task {
  id: string
  title: string
  description?: string
  agent_name?: string
  status: string
  mission_id?: string
  domain?: string
  created_at: number
  updated_at: number
}

const tasks = ref<Task[]>([])
const agents = ref<{ name: string }[]>([])
const activeAgent = ref('All')
const dragOverCol = ref<string | null>(null)
const showNewTask = ref(false)
const newTaskCol = ref('backlog')
const newTaskTitle = ref('')
const newTaskAgent = ref('')
const newTaskDomain = ref('dev')
let draggedTask: Task | null = null

const columns = [
  { id: 'backlog', title: 'Backlog', color: 'var(--fg-dim)' },
  { id: 'todo', title: 'À faire', color: 'var(--info)' },
  { id: 'doing', title: 'En cours', color: 'var(--accent)' },
  { id: 'done', title: 'Terminé', color: 'var(--good)' },
]

const agentNames = computed(() => agents.value.map(a => a.name))

function agentAvatar(name: string): string {
  if (name === '_main') return '_M'
  return name.split('_')[0].slice(0, 2).toUpperCase()
}

function agentClass(name: string): string {
  if (name === '_main') return 'salmon'
  if (name.startsWith('coder')) return 'green'
  if (name.startsWith('researcher')) return 'blue'
  if (name.startsWith('memory')) return 'purple'
  return ''
}

function getCards(colId: string) {
  let cs = tasks.value.filter(t => t.status === colId)
  if (activeAgent.value !== 'All') {
    cs = cs.filter(t => t.agent_name === activeAgent.value)
  }
  return cs
}

async function fetchTasks() {
  tasks.value = await $fetch<Task[]>('/api/tasks')
}

async function fetchAgents() {
  agents.value = await $fetch<{ name: string }[]>('/api/agents')
}

function onDragStart(task: Task) {
  draggedTask = task
}

async function onDrop(colId: string) {
  dragOverCol.value = null
  if (!draggedTask) return
  const task = draggedTask
  draggedTask = null
  if (task.status === colId) return

  const idx = tasks.value.findIndex(t => t.id === task.id)
  if (idx !== -1) tasks.value[idx] = { ...task, status: colId }

  await $fetch(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: colId }),
  })
}

async function createTask() {
  if (!newTaskTitle.value.trim()) return
  await $fetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: newTaskTitle.value.trim(),
      agent_name: newTaskAgent.value || null,
      status: newTaskCol.value,
      domain: newTaskDomain.value,
    }),
  })
  showNewTask.value = false
  newTaskTitle.value = ''
  newTaskAgent.value = ''
  await fetchTasks()
}

async function spawnTask(task: Task) {
  if (!task.agent_name) return
  const { missionId } = await $fetch<{ missionId: string }>('/api/agents/spawn', {
    method: 'POST',
    body: JSON.stringify({ agent_name: task.agent_name, mission: task.title }),
  })
  await $fetch(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'doing', mission_id: missionId }),
  })
  await fetchTasks()
}

onMounted(async () => {
  await Promise.all([fetchTasks(), fetchAgents()])
})
</script>

<style scoped>
.page-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.page-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px;
}
.kanban-board {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 18px 20px;
  overflow-x: auto;
  align-items: flex-start;
}
.kanban-col {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.kanban-col-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px 10px;
  font-size: 12px;
  font-weight: 600;
}
.col-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.col-dot.backlog { background: var(--fg-dim); }
.col-dot.todo { background: var(--info); }
.col-dot.doing { background: var(--accent); box-shadow: 0 0 6px rgba(224,122,95,0.5); animation: pulse-dot 2s ease-in-out infinite; }
.col-dot.done { background: var(--good); }

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 6px rgba(224,122,95,0.5); }
  50% { box-shadow: 0 0 12px rgba(224,122,95,0.8); }
}

.kanban-drop-zone-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 80px;
  border-radius: 8px;
  padding: 2px;
  transition: background 0.15s;
}
.kanban-drop-zone-area.drag-over {
  background: var(--accent-softer);
  outline: 1px dashed rgba(224,122,95,0.3);
}
</style>
