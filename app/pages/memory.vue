<template>
  <div class="page-content">
    <div class="two-col">
      <!-- Left: file tree -->
      <div class="col-left">
        <div class="mem-header">
          <span class="page-title">Memory</span>
        </div>

        <div class="agent-pills">
          <button v-for="ag in agents" :key="ag.name" :class="['agent-pill', { active: selectedAgent === ag.name }]" @click="selectAgent(ag.name)">
            <span :class="['av', agentClass(ag.name)]" style="width:18px;height:18px;font-size:8px;">{{ agentAvatar(ag.name) }}</span>
            {{ ag.name }}
          </button>
        </div>

        <div class="file-tree">
          <div class="tree-dir">
            <span class="tree-dir-icon">📁</span>
            <span class="tree-dir-name mono">~/.mos/agents/{{ selectedAgent }}/memory</span>
          </div>
          <div class="tree-files">
            <div
              v-for="file in files"
              :key="file.name"
              :class="['tree-file', { active: selectedFile === file.name }]"
              @click="selectFile(file.name)"
            >
              <span class="tree-file-icon">{{ file.name.endsWith('.jsonl') ? '📊' : file.name.endsWith('.md') ? '📝' : '📄' }}</span>
              <span class="tree-file-name mono">{{ file.name }}</span>
              <span v-if="dirtyFiles.has(file.name)" class="tree-file-dot"></span>
              <span class="tree-file-size">{{ formatSize(file.size) }}</span>
            </div>
            <div v-if="files.length === 0" style="padding:12px 4px;font-size:11.5px;color:var(--fg-dimmer)">
              Aucun fichier.
            </div>
          </div>
        </div>

        <div class="mem-footer">
          <div class="mem-footer-label">Utilisation tokens</div>
          <div class="progress-bar" style="margin-bottom:6px;">
            <div class="fill green" :style="{ width: tokenUsagePct + '%' }"></div>
          </div>
          <div class="mem-footer-stats">
            <span>{{ formatTokens(totalChars) }} / ~100k tokens</span>
            <span :style="{ color: tokenUsagePct > 70 ? 'var(--warn)' : 'var(--good)' }">{{ tokenUsagePct }}%</span>
          </div>
        </div>
      </div>

      <!-- Right: editor -->
      <div class="col-right">
        <div class="editor-wrap">
          <div class="editor-header">
            <div class="breadcrumb mono">
              <span style="color:var(--fg-dimmer)">{{ selectedAgent }}</span>
              <span style="color:var(--fg-dimmer)">›</span>
              <span style="color:var(--accent)">{{ selectedFile || '—' }}</span>
            </div>
            <span v-if="saveStatus" :class="['badge', saveStatus === 'Saved ✓' ? 'good' : 'warn']">{{ saveStatus }}</span>
            <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
              <span style="font-size:11px;color:var(--fg-dim)">Split view</span>
              <label class="toggle">
                <input type="checkbox" v-model="splitView" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="editor-toolbar">
            <button class="btn sm icon" title="New file" @click="promptNewFile">+ File</button>
            <div style="flex:1;"></div>
            <button v-if="selectedFile" class="btn sm bad" @click="deleteFile">Delete</button>
          </div>

          <div :class="['editor-body', { split: splitView }]" v-if="selectedFile">
            <div class="editor-pane raw">
              <textarea
                class="textarea mono editor-textarea"
                v-model="fileContent"
                spellcheck="false"
                @input="markDirty"
              ></textarea>
            </div>
            <div v-if="splitView" class="editor-pane preview">
              <div class="md-preview" v-html="renderedContent"></div>
            </div>
          </div>
          <div v-else class="editor-body" style="align-items:center;justify-content:center;color:var(--fg-dimmer);font-size:13px;">
            Sélectionne un fichier
          </div>

          <div class="editor-footer" v-if="selectedFile">
            <span class="mono" style="font-size:10.5px;color:var(--fg-dimmer)">{{ wordCount }} words · {{ charCount }} chars</span>
            <div style="display:flex;gap:8px;">
              <button class="btn sm primary" @click="saveFile" :disabled="!dirtyFiles.has(selectedFile)">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

definePageMeta({ layout: 'default' })

const { $fetch } = useApi()

interface AgentInfo { name: string }
interface FileInfo { name: string; size: number; modified_at: number }

const agents = ref<AgentInfo[]>([])
const files = ref<FileInfo[]>([])
const selectedAgent = ref('_main')
const selectedFile = ref<string | null>(null)
const fileContent = ref('')
const splitView = ref(true)
const saveStatus = ref('')
const dirtyFiles = ref(new Set<string>())

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`
  return `${(bytes / 1024).toFixed(1)}k`
}

function formatTokens(chars: number): string {
  const tokens = Math.round(chars / 4)
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
  return String(tokens)
}

const totalChars = computed(() => files.value.reduce((acc, f) => acc + f.size, 0))
const tokenUsagePct = computed(() => Math.min(100, Math.round((totalChars.value / 4) / 1000 * 100 / 100)))

const wordCount = computed(() => fileContent.value.split(/\s+/).filter(Boolean).length)
const charCount = computed(() => fileContent.value.length)

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const renderedContent = computed(() => {
  let html = escapeHtml(fileContent.value)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`(.+?)`/g, '<code>$1</code>')
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
  html = html.replace(/\n\n/g, '</p><p>')
  return '<p>' + html + '</p>'
})

async function fetchAgents() {
  agents.value = await $fetch<AgentInfo[]>('/api/agents')
}

async function fetchFiles() {
  files.value = await $fetch<FileInfo[]>(`/api/memory/${selectedAgent.value}/files`)
}

async function selectAgent(name: string) {
  selectedAgent.value = name
  selectedFile.value = null
  fileContent.value = ''
  dirtyFiles.value.clear()
  await fetchFiles()
}

async function selectFile(name: string) {
  selectedFile.value = name
  try {
    const { content } = await $fetch<{ content: string }>(`/api/memory/${selectedAgent.value}/files/${name}`)
    fileContent.value = content
  } catch {
    fileContent.value = ''
  }
}

function markDirty() {
  if (selectedFile.value) dirtyFiles.value.add(selectedFile.value)
}

async function saveFile() {
  if (!selectedFile.value) return
  saveStatus.value = 'Saving…'
  try {
    await $fetch(`/api/memory/${selectedAgent.value}/files/${selectedFile.value}`, {
      method: 'PUT',
      body: JSON.stringify({ content: fileContent.value }),
    })
    dirtyFiles.value.delete(selectedFile.value)
    saveStatus.value = 'Saved ✓'
    await fetchFiles()
  } catch {
    saveStatus.value = 'Error'
  }
  setTimeout(() => { saveStatus.value = '' }, 2000)
}

async function deleteFile() {
  if (!selectedFile.value) return
  if (!confirm(`Supprimer ${selectedFile.value} ?`)) return
  await $fetch(`/api/memory/${selectedAgent.value}/files/${selectedFile.value}`, { method: 'DELETE' })
  selectedFile.value = null
  fileContent.value = ''
  await fetchFiles()
}

async function promptNewFile() {
  const name = prompt('Nom du fichier (ex: notes.md):')
  if (!name) return
  await $fetch(`/api/memory/${selectedAgent.value}/files/${name}`, {
    method: 'PUT',
    body: JSON.stringify({ content: '' }),
  })
  await fetchFiles()
  selectFile(name)
}

onMounted(async () => {
  await fetchAgents()
  if (agents.value.length > 0) {
    selectedAgent.value = agents.value[0].name
    await fetchFiles()
    if (files.value.length > 0) selectFile(files.value[0].name)
  }
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
  width: 320px;
  flex-shrink: 0;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.col-right {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.mem-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.agent-pills {
  display: flex;
  gap: 5px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
  flex-shrink: 0;
}
.agent-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.03);
  color: var(--fg-dim);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  transition: all 0.15s;
}
.agent-pill:hover { color: var(--fg); border-color: var(--line-2); }
.agent-pill.active { color: var(--accent); background: var(--accent-soft); border-color: rgba(224,122,95,0.3); }
.file-tree { flex: 1; overflow-y: auto; padding: 10px 12px; }
.tree-dir {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 4px; font-size: 10.5px; color: var(--fg-dim); margin-bottom: 4px;
}
.tree-dir-name { font-size: 10px; }
.tree-files { padding-left: 12px; }
.tree-file {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 8px; border-radius: 6px; cursor: pointer;
  transition: background 0.12s; margin-bottom: 2px;
}
.tree-file:hover { background: rgba(255,255,255,0.03); }
.tree-file.active { background: var(--accent-softer); border-left: 2px solid var(--accent); padding-left: 6px; }
.tree-file-icon { font-size: 13px; }
.tree-file-name { flex: 1; font-size: 12px; color: var(--fg); }
.tree-file-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--warn); flex-shrink: 0; }
.tree-file-size { font-size: 10px; color: var(--fg-dimmer); }
.mem-footer { padding: 12px 14px; border-top: 1px solid var(--line); flex-shrink: 0; }
.mem-footer-label { font-size: 10.5px; font-weight: 600; color: var(--fg-dim); margin-bottom: 6px; }
.mem-footer-stats { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--fg-dim); font-family: 'JetBrains Mono', monospace; }
.editor-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.editor-header {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 18px; border-bottom: 1px solid var(--line); flex-shrink: 0;
}
.breadcrumb { font-size: 12px; display: flex; align-items: center; gap: 6px; }
.editor-toolbar {
  display: flex; align-items: center; gap: 3px;
  padding: 7px 14px; border-bottom: 1px solid var(--line); flex-shrink: 0;
}
.editor-body { flex: 1; overflow: hidden; display: flex; }
.editor-body.split .editor-pane { flex: 1; }
.editor-pane { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.editor-pane.raw { border-right: 1px solid var(--line); }
.editor-textarea {
  flex: 1; resize: none; border-radius: 0; border: none; border-bottom: none;
  background: var(--bg); padding: 16px 18px; height: 100%;
  font-size: 12px; line-height: 1.7;
}
.md-preview { flex: 1; overflow-y: auto; padding: 16px 20px; font-size: 13px; line-height: 1.7; color: var(--fg); }
.md-preview :deep(h1) { font-size: 17px; font-weight: 700; color: var(--fg); margin: 0 0 12px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
.md-preview :deep(h2) { font-size: 14px; font-weight: 600; color: var(--fg); margin: 18px 0 8px; }
.md-preview :deep(h3) { font-size: 12.5px; font-weight: 600; color: var(--accent); margin: 12px 0 6px; }
.md-preview :deep(p) { margin: 0 0 8px; color: var(--fg-dim); }
.md-preview :deep(ul) { margin: 4px 0 8px 16px; }
.md-preview :deep(li) { margin-bottom: 4px; color: var(--fg-dim); }
.md-preview :deep(strong) { color: var(--fg); font-weight: 600; }
.md-preview :deep(code) { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; background: rgba(255,255,255,0.07); padding: 1px 5px; border-radius: 3px; color: var(--accent); }
.editor-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 18px; border-top: 1px solid var(--line); flex-shrink: 0;
}
</style>
