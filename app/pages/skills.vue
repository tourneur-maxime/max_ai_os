<template>
  <div class="page-content">
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title mono" style="font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.1em;font-size:13px;">SKILLS CATALOG</div>
        <div class="page-sub">{{ skills.length }} skills · {{ skills.filter(s => s.active).length }} actifs</div>
      </div>
      <button class="btn sm primary" style="margin-left:auto" @click="openCreateModal">+ New skill</button>
    </div>

    <!-- Filters -->
    <div class="skills-filters">
      <input v-model="searchQ" type="text" class="input" style="width:220px;" placeholder="Search skills…" />
      <div class="segmented">
        <button v-for="c in categories" :key="c" :class="['seg-btn', { active: activeCategory === c }]" @click="activeCategory = c">{{ c }}</button>
      </div>
      <div class="segmented">
        <button v-for="s in sources" :key="s" :class="['seg-btn', { active: activeSource === s }]" @click="activeSource = s">{{ s }}</button>
      </div>
    </div>

    <!-- Grid -->
    <div class="skills-grid">
      <div
        v-for="skill in filteredSkills"
        :key="skill.id"
        :class="['skill-card', { active: !!skill.active }]"
        @click="openModal(skill)"
      >
        <div class="skill-card-header">
          <div :class="['domain-tag', skill.category.toLowerCase()]">{{ skill.category }}</div>
          <label class="toggle" @click.stop>
            <input type="checkbox" :checked="!!skill.active" @change="toggleSkill(skill)" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="skill-name mono">{{ skill.name }}</div>
        <div class="skill-desc">{{ skill.description }}</div>
        <div class="skill-card-footer">
          <span :class="['domain-tag', skill.category.toLowerCase()]">{{ skill.category }}</span>
          <span class="skill-source-tag">{{ skill.source }}</span>
          <div v-if="skill.agent_name" class="skill-avatars">
            <span :class="['av', agentClass(skill.agent_name)]" style="width:16px;height:16px;font-size:7px;">{{ agentAvatar(skill.agent_name) }}</span>
          </div>
        </div>
      </div>
      <div v-if="filteredSkills.length === 0" style="grid-column:1/-1;padding:40px;text-align:center;color:var(--fg-dimmer);font-size:13px;">
        Aucun skill trouvé.
      </div>
    </div>

    <!-- Skill detail modal -->
    <div v-if="modalSkill" class="modal-overlay" @click.self="modalSkill = null">
      <div class="modal" style="width:620px;">
        <div class="modal-header">
          <span :class="['domain-tag', modalSkill.category.toLowerCase()]">{{ modalSkill.category }}</span>
          <div style="flex:1;">
            <div class="mono" style="font-size:14px;font-weight:700;color:var(--fg)">{{ modalSkill.name }}</div>
            <div style="font-size:11.5px;color:var(--fg-dim);margin-top:2px;">{{ modalSkill.description }}</div>
          </div>
          <button class="modal-close" @click="modalSkill = null">✕</button>
        </div>
        <div class="modal-body">
          <div class="section-title">Command / Mission prompt</div>
          <div class="code-block" style="font-size:11px;white-space:pre-wrap;">{{ modalSkill.command }}</div>

          <div v-if="modalSkill.yaml_def" class="section-title" style="margin-top:20px;">YAML definition</div>
          <div v-if="modalSkill.yaml_def" class="code-block" style="font-size:11px;">{{ modalSkill.yaml_def }}</div>

          <div style="display:flex;gap:8px;margin-top:20px;">
            <button v-if="modalSkill.agent_name" class="btn primary" @click="runSkill(modalSkill)">▶ Run</button>
            <button class="btn bad" @click="deleteSkill(modalSkill)">Delete</button>
            <button class="btn ghost" @click="modalSkill = null">Close</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create skill modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal" style="width:520px;">
        <div class="modal-header">
          <div style="font-size:14px;font-weight:600;">New Skill</div>
          <button class="modal-close" @click="showCreate = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="label">Name</label>
            <input type="text" class="input mono" v-model="createForm.name" placeholder="my_skill" />
          </div>
          <div class="form-group">
            <label class="label">Description</label>
            <input type="text" class="input" v-model="createForm.description" />
          </div>
          <div class="form-group">
            <label class="label">Command / Mission prompt</label>
            <textarea class="textarea mono" style="height:100px" v-model="createForm.command"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="label">Category</label>
              <select class="select" v-model="createForm.category">
                <option v-for="c in categories.filter(x => x !== 'All')" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="label">Agent</label>
              <select class="select" v-model="createForm.agent_name">
                <option value="">— none —</option>
                <option v-for="a in allAgents" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn primary" @click="createSkill">Create</button>
            <button class="btn ghost" @click="showCreate = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'

definePageMeta({ layout: 'default' })

const { $fetch } = useApi()

interface Skill {
  id: string
  name: string
  description?: string
  command: string
  agent_name?: string
  category: string
  source: string
  active: number
  yaml_def?: string
  created_at: number
}

const skills = ref<Skill[]>([])
const allAgents = ref<string[]>([])
const searchQ = ref('')
const activeCategory = ref('All')
const activeSource = ref('All')
const modalSkill = ref<Skill | null>(null)
const showCreate = ref(false)

const createForm = reactive({
  name: '',
  description: '',
  command: '',
  category: 'Dev',
  agent_name: '',
})

const categories = ['All', 'Dev', 'Content', 'Ops', 'Life', 'Research']
const sources = ['All', 'Built-in', 'Custom']

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

const filteredSkills = computed(() => {
  let ss = skills.value
  if (activeCategory.value !== 'All') ss = ss.filter(s => s.category === activeCategory.value)
  if (activeSource.value !== 'All') ss = ss.filter(s => s.source === activeSource.value)
  if (searchQ.value) {
    const q = searchQ.value.toLowerCase()
    ss = ss.filter(s => s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q))
  }
  return ss
})

async function fetchSkills() {
  skills.value = await $fetch<Skill[]>('/api/skills')
}

async function toggleSkill(skill: Skill) {
  const newActive = skill.active ? 0 : 1
  const idx = skills.value.findIndex(s => s.id === skill.id)
  if (idx !== -1) skills.value[idx] = { ...skill, active: newActive }
  await $fetch(`/api/skills/${skill.id}`, {
    method: 'PUT',
    body: JSON.stringify({ active: newActive }),
  })
}

function openModal(skill: Skill) {
  modalSkill.value = skill
}

function openCreateModal() {
  createForm.name = ''
  createForm.description = ''
  createForm.command = ''
  createForm.category = 'Dev'
  createForm.agent_name = ''
  showCreate.value = true
}

async function createSkill() {
  if (!createForm.name || !createForm.command) return
  await $fetch('/api/skills', {
    method: 'POST',
    body: JSON.stringify({ ...createForm, source: 'Custom' }),
  })
  showCreate.value = false
  await fetchSkills()
}

async function deleteSkill(skill: Skill) {
  if (!confirm(`Supprimer le skill "${skill.name}" ?`)) return
  await $fetch(`/api/skills/${skill.id}`, { method: 'DELETE' })
  modalSkill.value = null
  await fetchSkills()
}

async function runSkill(skill: Skill) {
  if (!skill.agent_name) return
  modalSkill.value = null
  await $fetch('/api/agents/spawn', {
    method: 'POST',
    body: JSON.stringify({ agent_name: skill.agent_name, mission: skill.command }),
  })
}

onMounted(async () => {
  const [, agentList] = await Promise.all([
    fetchSkills(),
    $fetch<{ name: string }[]>('/api/agents'),
  ])
  allAgents.value = (agentList as { name: string }[]).map(a => a.name)
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
  padding: 14px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.skills-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.skills-grid {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  align-content: start;
}
.skill-card {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 13px 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.skill-card:hover { border-color: var(--line-2); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
.skill-card.active { border-color: rgba(224,122,95,0.3); background: var(--accent-softer); }
.skill-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.skill-name { font-size: 12.5px; font-weight: 700; color: var(--fg); }
.skill-card.active .skill-name { color: var(--accent); }
.skill-desc { font-size: 11.5px; color: var(--fg-dim); line-height: 1.4; flex: 1; }
.skill-card-footer { display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.skill-source-tag {
  font-size: 10px; color: var(--fg-dimmer);
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  padding: 1px 6px; border-radius: 3px;
}
.skill-avatars { display: flex; margin-left: auto; }
.skill-avatars .av { margin-left: -4px; border: 1px solid var(--bg-1); }
.channel-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 7px; border: 1px solid var(--line); margin-bottom: 4px;
}
</style>
