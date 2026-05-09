<template>
  <div class="chat-root">
    <!-- Chat header -->
    <div class="chat-header">
      <div class="av xl salmon">_M</div>
      <div>
        <div class="chat-agent-name mono">{{ agentName }}</div>
        <div class="chat-agent-sub">
          <span class="status-dot active"></span>
          active · gpt-5-mini · orchestrator
        </div>
      </div>
      <div class="chat-stats-pill mono">
        <span>↑ 2,847 tokens</span>
        <span class="divider">·</span>
        <span>$0.034</span>
      </div>
      <div class="chat-header-spacer"></div>
      <NuxtLink to="/agents" class="btn sm">⚙ Edit config</NuxtLink>
    </div>

    <!-- Messages -->
    <div class="chat-messages" ref="messagesRef">
      <div v-for="(msg, idx) in messages" :key="idx" :class="['msg', msg.role]">
        <div v-if="msg.role === 'assistant'" class="msg-av av salmon">_M</div>
        <div class="msg-bubble">
          <div class="msg-meta" v-if="msg.role === 'assistant'">
            <span class="mono" style="color:var(--accent);font-size:10.5px;">_main</span>
            <span class="msg-time">{{ msg.time }}</span>
          </div>
          <div class="msg-meta" v-else>
            <span class="mono" style="color:var(--fg-dim);font-size:10.5px;">You</span>
            <span class="msg-time">{{ msg.time }}</span>
          </div>
          <div class="msg-content" v-html="msg.html"></div>
          <div v-if="msg.tools && msg.tools.length" class="msg-tools">
            <div v-for="t in msg.tools" :key="t.name" class="tool-call">
              <span class="tool-icon">⚡</span>
              <span class="mono tool-name">{{ t.name }}</span>
              <span class="tool-args mono">{{ t.args }}</span>
              <span v-if="t.result" :class="['badge', 'good', 'tool-result']">{{ t.result }}</span>
            </div>
          </div>
        </div>
        <div v-if="msg.role === 'user'" class="msg-av av" style="background:linear-gradient(135deg,#2a2a2a,#1a1a1a)">M</div>
      </div>

      <!-- Thinking indicator -->
      <div v-if="thinking" class="msg assistant">
        <div class="msg-av av salmon">_M</div>
        <div class="msg-bubble">
          <div class="msg-meta">
            <span class="mono" style="color:var(--accent);font-size:10.5px;">_main</span>
            <span class="msg-time">{{ currentTime }}</span>
          </div>
          <div class="thinking-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Composer -->
    <div class="chat-composer">
      <div class="composer-mode-pills">
        <button
          v-for="m in modes"
          :key="m.value"
          :class="['mode-pill', { active: currentMode === m.value }]"
          @click="currentMode = m.value"
        >{{ m.label }}</button>
      </div>
      <div class="composer-context">
        <span class="mono" style="font-size:10.5px;color:var(--fg-dimmer)">Context: 2,847 / 128k tokens</span>
        <div class="context-bar">
          <div class="context-fill" style="width:2.2%"></div>
        </div>
      </div>
      <div class="composer-input-row">
        <textarea
          ref="composerRef"
          v-model="inputText"
          class="textarea composer-textarea"
          :placeholder="modePlaceholder"
          rows="1"
          @keydown.enter.exact.prevent="sendMessage"
          @input="autoResize"
        ></textarea>
        <div class="composer-btns">
          <button class="btn icon" title="Attach file">📎</button>
          <button class="btn primary icon" @click="sendMessage" :disabled="!inputText.trim()">→</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({ layout: 'default' })

const route = useRoute()
const agentName = computed(() => route.params.name as string)

const messagesRef = ref<HTMLDivElement | null>(null)
const composerRef = ref<HTMLTextAreaElement | null>(null)
const inputText = ref('')
const thinking = ref(false)
const currentMode = ref('mission')

const modes = [
  { value: 'question', label: '? Question' },
  { value: 'mission', label: '⚡ Mission' },
  { value: 'routine', label: '⏱ Routine' },
]

const modePlaceholders: Record<string, string> = {
  question: 'Ask _main a quick question…',
  mission: 'Describe a mission to run…',
  routine: 'Define a recurring routine…',
}

const modePlaceholder = computed(() => modePlaceholders[currentMode.value])

function getTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
}

const currentTime = ref(getTime())

interface Message {
  role: 'user' | 'assistant'
  html: string
  time: string
  tools?: { name: string; args: string; result?: string }[]
}

const messages = ref<Message[]>([
  {
    role: 'assistant',
    time: '09:14',
    html: `<p>Bonjour ! Je suis <b>_main</b>, ton orchestrateur local. Voici mon résumé du matin :</p>
<ul>
  <li>🟢 <b>coder_07</b> travaille sur <code>src/Kanban.tsx</code> — mission M-218</li>
  <li>🟢 <b>researcher_42</b> recherche sur WebAuthn mobile</li>
  <li>⚪ <b>memory_03</b> a terminé M-218, mémoire mise à jour</li>
</ul>
<p>Coût total ce matin : <b>$0.12</b>. Que souhaites-tu faire ?</p>`,
    tools: []
  },
  {
    role: 'user',
    time: '09:15',
    html: `<p>Lance une mission pour créer un composant de tableau de bord en Vue 3 avec D3.js pour visualiser les coûts par agent.</p>`
  },
  {
    role: 'assistant',
    time: '09:15',
    html: `<p>Mission M-219 créée. Je la délègue à <b>coder_07</b> avec le contexte projet. Voici le plan :</p>
<ol>
  <li>Analyse l'architecture actuelle des composants</li>
  <li>Crée <code>components/CostChart.vue</code> avec D3 force layout</li>
  <li>Intègre les données mock depuis le store Pinia</li>
  <li>Ajoute les animations de transition</li>
</ol>`,
    tools: [
      { name: 'spawn_mission', args: 'M-219 · coder_07', result: 'spawned' },
      { name: 'read_file', args: 'src/components/', result: '14 files' },
    ]
  },
  {
    role: 'user',
    time: '09:17',
    html: `<p>Combien de tokens a consommé researcher_42 cette semaine ?</p>`
  },
  {
    role: 'assistant',
    time: '09:17',
    html: `<p>Cette semaine, <b>researcher_42</b> a consommé :</p>
<ul>
  <li>Input: <b>184,320</b> tokens</li>
  <li>Output: <b>42,180</b> tokens</li>
  <li>Total: <b>226,500</b> tokens</li>
  <li>Coût: <b>$2.18</b></li>
</ul>
<p>C'est 23% de plus que la semaine dernière, principalement dû aux recherches WebAuthn.</p>`,
    tools: [
      { name: 'query_memory', args: 'researcher_42 tokens week', result: 'found' },
    ]
  },
])

const AUTO_RESPONSES: Record<string, string> = {
  mission: `<p>Mission reçue ✓ Je l'analyse et la décompose en sous-tâches…</p>
<p>Délégation en cours vers les agents disponibles. Tu recevras une mise à jour dès que la première étape sera terminée.</p>`,
  question: `<p>Bonne question. Laisse-moi vérifier ça dans la mémoire système…</p>
<p>Réponse trouvée : selon les logs des 7 derniers jours, c'est bien le cas. Tu veux que j'approfondisse ?</p>`,
  routine: `<p>Routine enregistrée ✓</p>
<p>Elle s'exécutera selon le planning défini. Tu peux la modifier à tout moment dans <code>/agents/routines</code>.</p>`,
}

async function sendMessage() {
  if (!inputText.value.trim()) return
  const text = inputText.value.trim()
  inputText.value = ''
  if (composerRef.value) {
    composerRef.value.style.height = 'auto'
  }

  messages.value.push({
    role: 'user',
    time: getTime(),
    html: `<p>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
  })

  await nextTick()
  scrollToBottom()

  thinking.value = true
  currentTime.value = getTime()

  await new Promise(r => setTimeout(r, 1400))

  thinking.value = false
  messages.value.push({
    role: 'assistant',
    time: getTime(),
    html: AUTO_RESPONSES[currentMode.value] || AUTO_RESPONSES.question,
    tools: currentMode.value === 'mission' ? [
      { name: 'parse_mission', args: text.slice(0, 40) + '…', result: 'ok' }
    ] : []
  })

  await nextTick()
  scrollToBottom()
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

function autoResize(e: Event) {
  const t = e.target as HTMLTextAreaElement
  t.style.height = 'auto'
  t.style.height = Math.min(t.scrollHeight, 180) + 'px'
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.chat-root {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: var(--bg);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--line);
  background: rgba(15,15,15,0.6);
  flex-shrink: 0;
}
.chat-agent-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg);
}
.chat-agent-sub {
  font-size: 11.5px;
  color: var(--fg-dim);
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}
.status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--fg-dimmer);
  flex-shrink: 0;
}
.status-dot.active {
  background: var(--good);
  box-shadow: 0 0 5px var(--good-glow);
}
.chat-stats-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  border-radius: 20px;
  font-size: 11px;
  color: var(--fg-dim);
}
.divider { color: var(--fg-dimmer); }
.chat-header-spacer { flex: 1; }

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.msg.user {
  flex-direction: row-reverse;
}
.msg-av {
  flex-shrink: 0;
  margin-top: 2px;
}
.msg-bubble {
  max-width: 72%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.msg.user .msg-bubble { align-items: flex-end; }
.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.msg.user .msg-meta { flex-direction: row-reverse; }
.msg-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--fg-dimmer);
}
.msg-content {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 11px 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--fg);
}
.msg-content :deep(p) { margin: 0 0 8px; }
.msg-content :deep(p:last-child) { margin-bottom: 0; }
.msg-content :deep(ul), .msg-content :deep(ol) { margin: 6px 0 6px 18px; padding: 0; }
.msg-content :deep(li) { margin-bottom: 3px; }
.msg-content :deep(code) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  background: rgba(255,255,255,0.07);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--accent);
}
.msg-content :deep(b) { color: var(--fg); font-weight: 600; }
.msg.user .msg-content {
  background: var(--accent-softer);
  border-color: rgba(224,122,95,0.2);
}
.msg-tools {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}
.tool-call {
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 9px;
  font-size: 11px;
}
.tool-icon { font-size: 10px; }
.tool-name { color: var(--accent); font-size: 11px; }
.tool-args { color: var(--fg-dimmer); font-size: 10.5px; }
.tool-result { margin-left: auto; font-size: 10px; }

.chat-composer {
  flex-shrink: 0;
  padding: 14px 20px 16px;
  border-top: 1px solid var(--line);
  background: linear-gradient(to top, rgba(15,15,15,0.9) 0%, rgba(10,10,10,0.7) 100%);
  backdrop-filter: blur(8px);
}
.composer-mode-pills {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
}
.mode-pill {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.03);
  color: var(--fg-dim);
  cursor: pointer;
  transition: all 0.15s;
}
.mode-pill:hover { color: var(--fg); }
.mode-pill.active {
  color: var(--accent);
  border-color: rgba(224,122,95,0.3);
  background: var(--accent-soft);
}
.composer-context {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.context-bar {
  flex: 1;
  height: 3px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px;
  overflow: hidden;
}
.context-fill {
  height: 100%;
  background: var(--good);
  border-radius: 2px;
}
.composer-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.composer-textarea {
  flex: 1;
  resize: none;
  min-height: 42px;
  max-height: 180px;
  overflow-y: auto;
}
.composer-btns {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
