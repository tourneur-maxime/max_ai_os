<template>
  <div class="chat-root">
    <!-- Chat header -->
    <div class="chat-header">
      <div :class="['av', 'xl', agentClass(agentName)]">{{ agentAvatar(agentName) }}</div>
      <div>
        <div class="chat-agent-name mono">{{ agentName }}</div>
        <div class="chat-agent-sub">
          <span :class="['status-dot', currentMissionId ? 'active' : '']"></span>
          {{ currentMissionId ? 'en cours…' : 'idle' }} · {{ agentModel }}
        </div>
      </div>
      <div v-if="sessionTokens > 0" class="chat-stats-pill mono">
        <span>↑ {{ formatTokens(sessionTokens) }} tokens</span>
        <span class="divider">·</span>
        <span>${{ sessionCost.toFixed(4) }}</span>
      </div>
      <div class="chat-header-spacer"></div>
      <label class="toggle-label">
        <input type="checkbox" v-model="freshStart" class="toggle-cb" />
        <span class="toggle-text">Fresh start</span>
      </label>
      <NuxtLink to="/agents" class="btn sm">⚙ Edit config</NuxtLink>
    </div>

    <!-- Messages -->
    <div class="chat-messages" ref="messagesRef">
      <div v-for="(msg, idx) in messages" :key="idx" :class="['msg', msg.role]">
        <div v-if="msg.role === 'assistant'" :class="['msg-av', 'av', agentClass(agentName)]">{{ agentAvatar(agentName) }}</div>
        <div class="msg-bubble">
          <div class="msg-meta" v-if="msg.role === 'assistant'">
            <span class="mono" style="color:var(--accent);font-size:10.5px;">{{ agentName }}</span>
            <span class="msg-time">{{ msg.time }}</span>
          </div>
          <div class="msg-meta" v-else>
            <span class="mono" style="color:var(--fg-dim);font-size:10.5px;">You</span>
            <span class="msg-time">{{ msg.time }}</span>
          </div>
          <div class="msg-content" v-html="msg.html"></div>
          <div v-if="msg.tools && msg.tools.length" class="msg-tools">
            <div v-for="t in msg.tools" :key="t.id + t.name" class="tool-call">
              <span class="tool-icon">⚡</span>
              <span class="mono tool-name">{{ t.name }}</span>
              <span class="tool-args mono">{{ t.args }}</span>
              <span v-if="t.result" :class="['badge', 'good', 'tool-result']">ok</span>
            </div>
          </div>
        </div>
        <div v-if="msg.role === 'user'" class="msg-av av" style="background:linear-gradient(135deg,#2a2a2a,#1a1a1a)">M</div>
      </div>

      <!-- Thinking indicator -->
      <div v-if="thinking" class="msg assistant">
        <div :class="['msg-av', 'av', agentClass(agentName)]">{{ agentAvatar(agentName) }}</div>
        <div class="msg-bubble">
          <div class="msg-meta">
            <span class="mono" style="color:var(--accent);font-size:10.5px;">{{ agentName }}</span>
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
          <button class="btn primary icon" @click="sendMessage" :disabled="!inputText.trim() || thinking">→</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({ layout: 'default' })

const { $fetch, useSSE } = useApi()
const route = useRoute()
const agentName = computed(() => route.params.name as string)

const messagesRef = ref<HTMLDivElement | null>(null)
const composerRef = ref<HTMLTextAreaElement | null>(null)
const inputText = ref('')
const thinking = ref(false)
const currentMode = ref('mission')
const currentMissionId = ref<string | null>(null)
const agentModel = ref('claude-sonnet-4-6')
const sessionTokens = ref(0)
const sessionCost = ref(0)
const freshStart = ref(false)
let sseClose: (() => void) | null = null

const modes = [
  { value: 'question', label: '? Question' },
  { value: 'mission', label: '⚡ Mission' },
]

const modePlaceholders: Record<string, string> = {
  question: `Ask ${agentName.value} a quick question…`,
  mission: 'Describe a mission to run…',
}

const modePlaceholder = computed(() => modePlaceholders[currentMode.value] ?? 'Message…')

interface Message {
  role: 'user' | 'assistant'
  html: string
  time: string
  tools?: { id: string; name: string; args: string; result?: string }[]
}

const messages = ref<Message[]>([])

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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

function getTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function textToHtml(text: string): string {
  if (!text) return ''
  const escaped = escapeHtml(text)
  return '<p>' + escaped.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>') + '</p>'
}

function subscribeToMission(missionId: string) {
  if (sseClose) { sseClose(); sseClose = null }

  let assistantText = ''
  let assistantTools: { id: string; name: string; args: string; result?: string }[] = []
  let assistantMsgIndex = -1
  const toolResults: Record<string, string> = {}

  sseClose = useSSE(`/api/missions/${missionId}/stream`, (data) => {
    if (data.type === 'mission_complete') {
      thinking.value = false
      currentMissionId.value = null
      if (sseClose) { sseClose(); sseClose = null }
      return
    }

    if (data.type === 'assistant') {
      thinking.value = false
      const msg = data.message as { content?: { type: string; text?: string; id?: string; name?: string; input?: unknown }[] }
      const content = msg?.content ?? []

      for (const block of content) {
        if (block.type === 'text' && block.text) {
          assistantText += block.text
        }
        if (block.type === 'tool_use' && block.name) {
          assistantTools.push({
            id: block.id ?? '',
            name: block.name,
            args: JSON.stringify(block.input ?? {}).slice(0, 60),
          })
        }
      }

      if (assistantMsgIndex === -1) {
        messages.value.push({
          role: 'assistant',
          time: getTime(),
          html: textToHtml(assistantText),
          tools: assistantTools,
        })
        assistantMsgIndex = messages.value.length - 1
      } else {
        messages.value[assistantMsgIndex] = {
          ...messages.value[assistantMsgIndex],
          html: textToHtml(assistantText),
          tools: assistantTools,
        }
      }
      nextTick(scrollToBottom)
    }

    if (data.type === 'user') {
      const msg = data.message as { content?: { type: string; tool_use_id?: string; content?: unknown }[] }
      const content = msg?.content ?? []
      for (const block of content) {
        if (block.type === 'tool_result' && block.tool_use_id) {
          toolResults[block.tool_use_id] = String(block.content ?? '')
          if (assistantMsgIndex !== -1) {
            const tools = messages.value[assistantMsgIndex].tools ?? []
            const t = tools.find(x => x.id === block.tool_use_id)
            if (t) t.result = 'ok'
          }
        }
      }
    }

    if (data.type === 'result') {
      const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined
      sessionTokens.value += (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0)
      sessionCost.value += (data.cost_usd as number) ?? 0
      thinking.value = false
      currentMissionId.value = null
      assistantText = ''
      assistantTools = []
      assistantMsgIndex = -1
    }
  })
}

async function sendMessage() {
  if (!inputText.value.trim() || thinking.value) return
  const text = inputText.value.trim()
  inputText.value = ''
  if (composerRef.value) composerRef.value.style.height = 'auto'

  messages.value.push({ role: 'user', time: getTime(), html: `<p>${escapeHtml(text)}</p>` })
  await nextTick()
  scrollToBottom()
  thinking.value = true

  try {
    const { missionId } = await $fetch<{ missionId: string }>('/api/agents/spawn', {
      method: 'POST',
      body: JSON.stringify({ agent_name: agentName.value, mission: text, withHistory: !freshStart.value }),
    })
    currentMissionId.value = missionId
    subscribeToMission(missionId)
  } catch (e: unknown) {
    thinking.value = false
    messages.value.push({
      role: 'assistant',
      time: getTime(),
      html: `<p style="color:var(--bad)">Erreur : ${escapeHtml((e as Error).message)}</p>`,
    })
  }
}

function scrollToBottom() {
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

function autoResize(e: Event) {
  const t = e.target as HTMLTextAreaElement
  t.style.height = 'auto'
  t.style.height = Math.min(t.scrollHeight, 180) + 'px'
}

onMounted(async () => {
  try {
    const agent = await $fetch<{ model: string }>(`/api/agents`)
    const agents = agent as unknown as { name: string; model: string }[]
    const found = agents.find(a => a.name === agentName.value)
    if (found) agentModel.value = found.model
  } catch { /* ignore */ }
})

onUnmounted(() => {
  if (sseClose) sseClose()
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
.chat-agent-name { font-size: 14px; font-weight: 700; color: var(--fg); }
.chat-agent-sub {
  font-size: 11.5px; color: var(--fg-dim);
  display: flex; align-items: center; gap: 5px; margin-top: 2px;
}
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--fg-dimmer); flex-shrink: 0; }
.status-dot.active { background: var(--good); box-shadow: 0 0 5px var(--good-glow); }
.chat-stats-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 12px; background: rgba(255,255,255,0.04);
  border: 1px solid var(--line); border-radius: 20px;
  font-size: 11px; color: var(--fg-dim);
}
.divider { color: var(--fg-dimmer); }
.chat-header-spacer { flex: 1; }
.chat-messages {
  flex: 1; overflow-y: auto;
  padding: 20px 24px; display: flex; flex-direction: column; gap: 16px;
}
.msg { display: flex; gap: 10px; align-items: flex-start; }
.msg.user { flex-direction: row-reverse; }
.msg-av { flex-shrink: 0; margin-top: 2px; }
.msg-bubble { max-width: 72%; display: flex; flex-direction: column; gap: 5px; }
.msg.user .msg-bubble { align-items: flex-end; }
.msg-meta { display: flex; align-items: center; gap: 8px; }
.msg.user .msg-meta { flex-direction: row-reverse; }
.msg-time { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--fg-dimmer); }
.msg-content {
  background: var(--bg-1); border: 1px solid var(--line);
  border-radius: 10px; padding: 11px 14px;
  font-size: 13px; line-height: 1.6; color: var(--fg);
}
.msg-content :deep(p) { margin: 0 0 8px; }
.msg-content :deep(p:last-child) { margin-bottom: 0; }
.msg-content :deep(ul), .msg-content :deep(ol) { margin: 6px 0 6px 18px; padding: 0; }
.msg-content :deep(li) { margin-bottom: 3px; }
.msg-content :deep(code) {
  font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
  background: rgba(255,255,255,0.07); padding: 1px 5px; border-radius: 3px; color: var(--accent);
}
.msg-content :deep(b) { color: var(--fg); font-weight: 600; }
.msg.user .msg-content { background: var(--accent-softer); border-color: rgba(224,122,95,0.2); }
.msg-tools { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
.tool-call {
  display: flex; align-items: center; gap: 7px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--line);
  border-radius: 6px; padding: 4px 9px; font-size: 11px;
}
.tool-icon { font-size: 10px; }
.tool-name { color: var(--accent); font-size: 11px; }
.tool-args { color: var(--fg-dimmer); font-size: 10.5px; }
.tool-result { margin-left: auto; font-size: 10px; }
.chat-composer {
  flex-shrink: 0; padding: 14px 20px 16px;
  border-top: 1px solid var(--line);
  background: linear-gradient(to top, rgba(15,15,15,0.9) 0%, rgba(10,10,10,0.7) 100%);
  backdrop-filter: blur(8px);
}
.composer-mode-pills { display: flex; gap: 5px; margin-bottom: 10px; }
.mode-pill {
  padding: 4px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 500;
  border: 1px solid var(--line); background: rgba(255,255,255,0.03);
  color: var(--fg-dim); cursor: pointer; transition: all 0.15s;
}
.mode-pill:hover { color: var(--fg); }
.mode-pill.active { color: var(--accent); border-color: rgba(224,122,95,0.3); background: var(--accent-soft); }
.composer-input-row { display: flex; gap: 8px; align-items: flex-end; }
.composer-textarea { flex: 1; resize: none; min-height: 42px; max-height: 180px; overflow-y: auto; }
.composer-btns { display: flex; gap: 6px; flex-shrink: 0; }
.toggle-label { display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
.toggle-cb { accent-color: var(--accent); cursor: pointer; }
.toggle-text { font-size: 11.5px; color: var(--fg-dim); }
</style>
