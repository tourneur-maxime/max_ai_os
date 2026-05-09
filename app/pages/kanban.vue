<template>
  <div class="page-content">
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">Kanban</div>
        <div class="page-sub">Active missions board</div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:10px;">
        <div class="filter-pills">
          <button v-for="ag in agentFilters" :key="ag" :class="['filter-pill', { active: activeAgent === ag }]" @click="activeAgent = ag">{{ ag }}</button>
        </div>
        <div class="segmented">
          <button v-for="v in views" :key="v.value" :class="['seg-btn', { active: currentView === v.value }]" @click="currentView = v.value">{{ v.label }}</button>
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
            :class="['kanban-card', { 'active-card': card.colId === 'doing' }]"
            draggable="true"
            @dragstart="onDragStart(card)"
            @dragend="dragOverCol = null"
          >
            <div class="kanban-card-id">{{ card.id }}</div>
            <div class="kanban-card-title">{{ card.title }}</div>
            <div v-if="card.colId === 'doing'" class="progress-bar" style="margin-bottom:8px;">
              <div class="fill" :style="{ width: card.progress + '%', background: 'var(--accent)' }"></div>
            </div>
            <div class="kanban-card-footer">
              <span :class="['domain-tag', card.domain]">{{ card.domain }}</span>
              <div style="display:flex;align-items:center;gap:5px;margin-left:4px;">
                <span :class="['av', card.agentCls]" style="width:16px;height:16px;font-size:7px;">{{ card.agentAv }}</span>
                <span class="mono" style="font-size:10px;color:var(--fg-dimmer)">{{ card.agent }}</span>
              </div>
              <span class="kanban-card-cost">{{ card.cost }}</span>
            </div>
          </div>

          <div v-if="getCards(col.id).length === 0" class="kanban-drop-zone">
            <span>Drop here</span>
          </div>
        </div>

        <button class="btn sm ghost" style="width:100%;margin-top:6px;color:var(--fg-dimmer)">+ Add card</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

definePageMeta({ layout: 'default' })

const activeAgent = ref('All')
const currentView = ref('kanban')
const dragOverCol = ref<string | null>(null)
let draggedCard: any = null

const agentFilters = ['All', '_main', 'coder_07', 'researcher_42', 'planner_04']
const views = [
  { value: 'kanban', label: '⊞ Kanban' },
  { value: 'list', label: '≡ List' },
  { value: 'calendar', label: '📅 Calendar' },
]

const columns = [
  { id: 'backlog', title: 'Backlog', color: 'var(--fg-dim)' },
  { id: 'todo', title: 'À faire', color: 'var(--info)' },
  { id: 'doing', title: 'En cours', color: 'var(--accent)' },
  { id: 'done', title: 'Terminé', color: 'var(--good)' },
]

const cards = reactive([
  { id: 'M-230', title: 'Implement OAuth2 PKCE flow', colId: 'backlog', domain: 'dev', agent: 'coder_07', agentAv: 'C', agentCls: 'green', cost: '$0.40', progress: 0 },
  { id: 'M-229', title: 'Research competitor pricing pages', colId: 'backlog', domain: 'research', agent: 'researcher_42', agentAv: 'R', agentCls: 'blue', cost: '$0.28', progress: 0 },
  { id: 'M-228', title: 'Write changelog for v1.3', colId: 'backlog', domain: 'content', agent: '_main', agentAv: '_M', agentCls: 'salmon', cost: '$0.12', progress: 0 },
  { id: 'M-227', title: 'Setup CI/CD pipeline for agent tests', colId: 'backlog', domain: 'ops', agent: 'shell_01', agentAv: 'Sh', agentCls: '', cost: '$0.08', progress: 0 },
  { id: 'M-226', title: 'Design Q3 roadmap', colId: 'todo', domain: 'product', agent: 'planner_04', agentAv: 'Pl', agentCls: '', cost: '$0.64', progress: 0 },
  { id: 'M-225', title: 'Add Redis caching layer', colId: 'todo', domain: 'dev', agent: 'coder_07', agentAv: 'C', agentCls: 'green', cost: '$0.32', progress: 0 },
  { id: 'M-224', title: 'Write unit tests for auth module', colId: 'todo', domain: 'dev', agent: 'reviewer_19', agentAv: 'Rv', agentCls: '', cost: '$0.18', progress: 0 },
  { id: 'M-223', title: 'Daily memory compaction', colId: 'todo', domain: 'ops', agent: 'memory_03', agentAv: 'M', agentCls: 'purple', cost: '$0.04', progress: 0 },
  { id: 'M-222', title: 'Update Kanban with DnD support', colId: 'doing', domain: 'dev', agent: 'coder_07', agentAv: 'C', agentCls: 'green', cost: '$0.18', progress: 72 },
  { id: 'M-221', title: 'Research WebAuthn mobile', colId: 'doing', domain: 'research', agent: 'researcher_42', agentAv: 'R', agentCls: 'blue', cost: '$0.42', progress: 45 },
  { id: 'M-220', title: 'Sprint planning week 20', colId: 'doing', domain: 'product', agent: 'planner_04', agentAv: 'Pl', agentCls: '', cost: '$0.56', progress: 30 },
  { id: 'M-219', title: 'Dashboard D3 cost chart', colId: 'doing', domain: 'dev', agent: '_main', agentAv: '_M', agentCls: 'salmon', cost: '$0.34', progress: 88 },
  { id: 'M-218', title: 'Review PR #142 auth refactor', colId: 'done', domain: 'dev', agent: 'reviewer_19', agentAv: 'Rv', agentCls: '', cost: '$0.09', progress: 100 },
  { id: 'M-217', title: 'Fix TypeScript errors dashboard', colId: 'done', domain: 'dev', agent: 'coder_07', agentAv: 'C', agentCls: 'green', cost: '$0.22', progress: 100 },
  { id: 'M-216', title: 'Write blog post on agentic OS', colId: 'done', domain: 'content', agent: '_main', agentAv: '_M', agentCls: 'salmon', cost: '$0.94', progress: 100 },
  { id: 'M-215', title: 'Summarize RAG architecture research', colId: 'done', domain: 'research', agent: 'researcher_42', agentAv: 'R', agentCls: 'blue', cost: '$0.68', progress: 100 },
  { id: 'M-214', title: 'Cleanup old log files', colId: 'done', domain: 'ops', agent: 'shell_01', agentAv: 'Sh', agentCls: '', cost: '$0.01', progress: 100 },
  { id: 'M-213', title: 'Update memory patterns', colId: 'done', domain: 'ops', agent: 'memory_03', agentAv: 'M', agentCls: 'purple', cost: '$0.04', progress: 100 },
])

function getCards(colId: string) {
  let cs = cards.filter(c => c.colId === colId)
  if (activeAgent.value !== 'All') {
    cs = cs.filter(c => c.agent === activeAgent.value)
  }
  return cs
}

function onDragStart(card: any) {
  draggedCard = card
}

function onDrop(colId: string) {
  if (draggedCard) {
    draggedCard.colId = colId
    if (colId === 'done') draggedCard.progress = 100
    else if (colId === 'doing' && draggedCard.progress === 0) draggedCard.progress = 10
    draggedCard = null
  }
  dragOverCol.value = null
}
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
