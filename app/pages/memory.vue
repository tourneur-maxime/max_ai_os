<template>
  <div class="page-content">
    <div class="two-col">
      <!-- Left: file tree -->
      <div class="col-left">
        <div class="mem-header">
          <span class="page-title">Memory</span>
          <select class="select" style="width:auto;font-size:11px;padding:4px 24px 4px 8px;">
            <option>_main</option>
            <option>coder_07</option>
            <option>researcher_42</option>
          </select>
        </div>

        <div class="agent-pills">
          <button v-for="ag in agentPills" :key="ag.id" :class="['agent-pill', { active: selectedAgent === ag.id }]" @click="selectedAgent = ag.id">
            <span :class="['av', ag.cls]" style="width:18px;height:18px;font-size:8px;">{{ ag.av }}</span>
            {{ ag.id }}
          </button>
        </div>

        <div class="file-tree">
          <div class="tree-dir">
            <span class="tree-dir-icon">📁</span>
            <span class="tree-dir-name mono">~/agents/_main/memory</span>
          </div>
          <div class="tree-files">
            <div
              v-for="file in files"
              :key="file.name"
              :class="['tree-file', { active: selectedFile === file.name }]"
              @click="selectedFile = file.name"
            >
              <span class="tree-file-icon">{{ file.icon }}</span>
              <span class="tree-file-name mono">{{ file.name }}</span>
              <span v-if="file.modified" class="tree-file-dot"></span>
              <span class="tree-file-size">{{ file.size }}</span>
            </div>
          </div>
        </div>

        <div class="mem-footer">
          <div class="mem-footer-label">Token usage</div>
          <div class="progress-bar" style="margin-bottom:6px;">
            <div class="fill green" style="width:34%"></div>
          </div>
          <div class="mem-footer-stats">
            <span>34,218 / 100k tokens</span>
            <span style="color:var(--good)">34%</span>
          </div>
          <div style="margin-top:8px;font-size:10.5px;color:var(--fg-dimmer)">Last compacted: 3 days ago</div>
        </div>
      </div>

      <!-- Right: editor -->
      <div class="col-right">
        <div class="editor-wrap">
          <div class="editor-header">
            <div class="breadcrumb mono">
              <span style="color:var(--fg-dimmer)">_main</span>
              <span style="color:var(--fg-dimmer)">›</span>
              <span style="color:var(--accent)">{{ selectedFile }}</span>
            </div>
            <span class="badge warn">edited 2s ago</span>
            <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
              <span style="font-size:11px;color:var(--fg-dim)">Split view</span>
              <label class="toggle">
                <input type="checkbox" v-model="splitView" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="editor-toolbar">
            <button v-for="t in toolbar" :key="t.label" class="btn sm icon" :title="t.label" @click="t.action && t.action()">{{ t.icon }}</button>
            <div style="flex:1;"></div>
            <button class="btn sm" @click="showDiff = !showDiff">{{ showDiff ? 'Hide changes' : 'Show changes' }}</button>
          </div>

          <div :class="['editor-body', { split: splitView }]">
            <div class="editor-pane raw">
              <textarea
                class="textarea mono editor-textarea"
                v-model="fileContent"
                spellcheck="false"
              ></textarea>
            </div>
            <div v-if="splitView" class="editor-pane preview">
              <div class="md-preview" v-html="renderedContent"></div>
            </div>
          </div>

          <div class="editor-footer">
            <span class="mono" style="font-size:10.5px;color:var(--fg-dimmer)">{{ wordCount }} words · {{ charCount }} chars · ~{{ tokenCount }} tokens</span>
            <div style="display:flex;gap:8px;">
              <button class="btn sm">Export</button>
              <button class="btn sm primary" @click="showCompactModal = true">Compact memory</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Compact modal -->
    <div v-if="showCompactModal" class="modal-overlay" @click.self="showCompactModal = false">
      <div class="modal">
        <div class="modal-header">
          <div style="font-size:14px;font-weight:600;">Compact Memory</div>
          <button class="modal-close" @click="showCompactModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="warn-box" style="margin-bottom:14px;">
            Compaction résume les entrées anciennes et libère des tokens. Cette action est irréversible.
          </div>
          <div class="form-group">
            <label class="label">Strategy</label>
            <select class="select">
              <option>Summarize old entries (recommended)</option>
              <option>Keep last N entries</option>
              <option>Prune by importance score</option>
            </select>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn primary" @click="showCompactModal = false">Run Compact</button>
            <button class="btn ghost" @click="showCompactModal = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'default' })

const selectedAgent = ref('_main')
const selectedFile = ref('decisions.md')
const splitView = ref(true)
const showDiff = ref(false)
const showCompactModal = ref(false)

const agentPills = [
  { id: '_main', av: '_M', cls: 'salmon' },
  { id: 'coder_07', av: 'C', cls: 'green' },
  { id: 'researcher_42', av: 'R', cls: 'blue' },
]

const files = [
  { name: 'system.md', icon: '📄', size: '2.1k', modified: false },
  { name: 'decisions.md', icon: '📝', size: '4.8k', modified: true },
  { name: 'patterns.md', icon: '🔍', size: '3.2k', modified: false },
  { name: 'log.jsonl', icon: '📊', size: '12k', modified: false },
]

const toolbar = [
  { label: 'Bold', icon: 'B' },
  { label: 'Italic', icon: 'I' },
  { label: 'Underline', icon: 'U' },
  { label: 'Code', icon: '<>' },
  { label: 'Link', icon: '🔗' },
  { label: 'Unordered List', icon: '• —' },
  { label: 'Ordered List', icon: '1.' },
  { label: 'H1', icon: 'H1' },
  { label: 'H2', icon: 'H2' },
  { label: 'Quote', icon: '❝' },
]

const fileContent = ref(`# Decisions Log — _main

## 2026-05-08

### Architecture
- **Decision**: Migrer le state management de Pinia vers Zustand pour uniformiser avec le backend JS
- **Raison**: Réduire la duplication du code de synchronisation
- **Impact**: coder_07 doit refactorer 4 composants
- **Status**: ✅ Approuvé

### Infrastructure
- **Decision**: Ajouter un cache Redis pour les résultats de researcher_42
- **Raison**: Les recherches web coûtent $0.08 en moyenne, duplication fréquente
- **Impact**: +$12/mois serveur, -$40/mois LLM
- **Status**: 🔄 En cours (memory_03 intègre les patterns)

## 2026-05-07

### Security
- **Decision**: Passer les tokens d'API en variables d'environnement chiffrées
- **Raison**: Audit de sécurité du 06/05 a trouvé 2 tokens en clair dans le repo
- **Impact**: Tous les agents doivent être redémarrés avec les nouvelles vars
- **Status**: ✅ Terminé

### UX
- **Decision**: Ajouter un mode "plan" obligatoire pour les missions > $1
- **Raison**: 3 missions ont dépassé le budget sans alertes cette semaine
- **Impact**: Ajouter confirmation avant spawn d'agents coûteux
- **Status**: ✅ Implémenté dans _main v1.3.2

## 2026-05-06

### Agent Config
- **Decision**: Désactiver reviewer_19 pendant les weekends
- **Raison**: Taux d'utilisation < 2% samedi-dimanche, coût inutile
- **Impact**: Réduction coût hebdomadaire estimée à $0.80
- **Status**: ✅ Actif depuis 06/05

### Memory
- **Decision**: Compacter les logs d'avant le 01/05
- **Raison**: Token usage à 87% avant compaction
- **Impact**: Libéré 42k tokens, performance améliorée
- **Status**: ✅ Compacté le 06/05 à 23:00

## 2026-05-05

### Patterns détectés
- Maxime demande souvent des reviews de code le soir → pre-warm coder_07 à 17h
- Les missions de recherche durent en moyenne 4.2 min → timeout à 10 min
- researcher_42 rate 23% des recherches web → ajouter retry avec reformulation

## 2026-05-04

### Init
- Système Max OS — 1 démarré
- 7 agents configurés
- Première mission lancée : setup projet Nuxt
`)

const wordCount = computed(() => fileContent.value.split(/\s+/).filter(Boolean).length)
const charCount = computed(() => fileContent.value.length)
const tokenCount = computed(() => Math.round(charCount.value / 4))

function escapeHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
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
  html = '<p>' + html + '</p>'
  return html
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

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}
.tree-dir {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
  font-size: 10.5px;
  color: var(--fg-dim);
  margin-bottom: 4px;
}
.tree-dir-name { font-size: 10px; }
.tree-files { padding-left: 12px; }
.tree-file {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
  margin-bottom: 2px;
}
.tree-file:hover { background: rgba(255,255,255,0.03); }
.tree-file.active { background: var(--accent-softer); border-left: 2px solid var(--accent); padding-left: 6px; }
.tree-file-icon { font-size: 13px; }
.tree-file-name { flex: 1; font-size: 12px; color: var(--fg); }
.tree-file-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--warn);
  flex-shrink: 0;
}
.tree-file-size { font-size: 10px; color: var(--fg-dimmer); }

.mem-footer {
  padding: 12px 14px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}
.mem-footer-label { font-size: 10.5px; font-weight: 600; color: var(--fg-dim); margin-bottom: 6px; }
.mem-footer-stats { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--fg-dim); font-family: 'JetBrains Mono', monospace; }

.editor-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.breadcrumb { font-size: 12px; display: flex; align-items: center; gap: 6px; }
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 7px 14px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.editor-body {
  flex: 1;
  overflow: hidden;
  display: flex;
}
.editor-body.split .editor-pane { flex: 1; }
.editor-pane {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.editor-pane.raw { border-right: 1px solid var(--line); }
.editor-textarea {
  flex: 1;
  resize: none;
  border-radius: 0;
  border: none;
  border-bottom: none;
  background: var(--bg);
  padding: 16px 18px;
  height: 100%;
  font-size: 12px;
  line-height: 1.7;
}
.md-preview {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg);
}
.md-preview :deep(h1) { font-size: 17px; font-weight: 700; color: var(--fg); margin: 0 0 12px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
.md-preview :deep(h2) { font-size: 14px; font-weight: 600; color: var(--fg); margin: 18px 0 8px; }
.md-preview :deep(h3) { font-size: 12.5px; font-weight: 600; color: var(--accent); margin: 12px 0 6px; }
.md-preview :deep(p) { margin: 0 0 8px; color: var(--fg-dim); }
.md-preview :deep(ul) { margin: 4px 0 8px 16px; }
.md-preview :deep(li) { margin-bottom: 4px; color: var(--fg-dim); }
.md-preview :deep(strong) { color: var(--fg); font-weight: 600; }
.md-preview :deep(code) { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; background: rgba(255,255,255,0.07); padding: 1px 5px; border-radius: 3px; color: var(--accent); }

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}
</style>
