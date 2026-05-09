<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <div class="page-title">Canaux</div>
        <div class="page-sub">{{ channels.length }} canal{{ channels.length !== 1 ? 'aux' : '' }} configuré{{ channels.length !== 1 ? 's' : '' }}</div>
      </div>
      <div class="page-header-spacer"></div>
      <button class="btn primary" @click="openAdd">+ Add channel</button>
    </div>

    <div class="channels-list">
      <div v-if="channels.length === 0" class="empty-state">
        Aucun canal configuré. Créez un canal webhook ou Telegram pour recevoir des messages.
      </div>

      <div v-for="ch in channels" :key="ch.name" class="channel-card">
        <div class="channel-header">
          <div class="channel-type-badge" :class="ch.config.type">{{ ch.config.type }}</div>
          <div class="channel-name mono">{{ ch.name }}</div>
          <div class="channel-agent">→ <span class="mono">{{ ch.config.defaultAgent }}</span></div>
          <div class="channel-card-spacer"></div>
          <button class="btn sm" @click="openEdit(ch)">Edit</button>
          <button class="btn sm bad" @click="confirmDelete(ch.name)">Delete</button>
        </div>

        <div v-if="ch.config.type === 'telegram'" class="channel-meta">
          <span class="meta-item">
            <span class="meta-label">Bot token env :</span>
            <span class="mono">{{ ch.config.botTokenEnv ?? 'TELEGRAM_BOT_TOKEN' }}</span>
          </span>
          <span v-if="!telegramEnvSet(ch.config.botTokenEnv)" class="warn-pill">⚠ token non défini</span>
          <span v-if="ch.config.allowedChatIds?.length" class="meta-item">
            <span class="meta-label">Chat IDs :</span>
            <span class="mono">{{ ch.config.allowedChatIds?.join(', ') }}</span>
          </span>
        </div>

        <div v-if="ch.config.type === 'webhook'" class="channel-meta">
          <span class="meta-item">
            <span class="meta-label">Inbound URL :</span>
            <span class="mono code-inline">POST /api/channels/{{ ch.name }}/inbound</span>
          </span>
          <span v-if="ch.config.webhookSecret" class="meta-item">
            <span class="meta-label">Secret HMAC :</span>
            <span class="mono">••••••••</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Modal Add / Edit -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-header">
          <div class="modal-title">{{ editing ? `Éditer — ${form.name}` : 'Nouveau canal' }}</div>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="field-group">
            <label class="field-label">Nom du canal</label>
            <input v-model="form.name" :disabled="!!editing" type="text" class="input" placeholder="ex: loyalty-webhook" />
          </div>
          <div class="field-group">
            <label class="field-label">Type</label>
            <div class="radio-row">
              <label class="radio-label"><input type="radio" v-model="form.type" value="webhook" /> Webhook</label>
              <label class="radio-label"><input type="radio" v-model="form.type" value="telegram" /> Telegram</label>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">Agent par défaut</label>
            <select v-model="form.defaultAgent" class="input">
              <option v-for="a in agents" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <template v-if="form.type === 'telegram'">
            <div class="field-group">
              <label class="field-label">Bot token env var</label>
              <input v-model="form.botTokenEnv" type="text" class="input" placeholder="TELEGRAM_BOT_TOKEN" />
            </div>
            <div class="field-group">
              <label class="field-label">Chat IDs autorisés (séparés par virgule)</label>
              <input v-model="form.allowedChatIds" type="text" class="input" placeholder="123456789, 987654321" />
            </div>
          </template>
          <template v-if="form.type === 'webhook'">
            <div class="field-group">
              <label class="field-label">Webhook secret (HMAC, optionnel)</label>
              <input v-model="form.webhookSecret" type="text" class="input" placeholder="laisser vide pour désactiver la vérification" />
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeModal">Annuler</button>
          <button class="btn primary" @click="saveChannel" :disabled="!form.name || !form.defaultAgent">
            {{ editing ? 'Mettre à jour' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm delete -->
    <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null">
      <div class="modal-box" style="max-width:380px;">
        <div class="modal-header">
          <div class="modal-title">Supprimer le canal</div>
          <button class="modal-close" @click="deleteTarget = null">✕</button>
        </div>
        <div class="modal-body">
          <p style="color:var(--fg-dim);font-size:13px;">
            Êtes-vous sûr de vouloir supprimer <span class="mono" style="color:var(--fg)">{{ deleteTarget }}</span> ?
            Le polling Telegram sera arrêté immédiatement.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="deleteTarget = null">Annuler</button>
          <button class="btn bad" @click="doDelete">Supprimer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'default' })

const { $fetch } = useApi()

interface ChannelConfig {
  type: 'webhook' | 'telegram'
  defaultAgent: string
  botTokenEnv?: string
  webhookSecret?: string
  allowedChatIds?: number[]
}

interface Channel {
  name: string
  config: ChannelConfig
}

const channels = ref<Channel[]>([])
const agents = ref<string[]>([])
const showModal = ref(false)
const editing = ref<string | null>(null)
const deleteTarget = ref<string | null>(null)

const form = ref({
  name: '',
  type: 'webhook' as 'webhook' | 'telegram',
  defaultAgent: '',
  botTokenEnv: '',
  allowedChatIds: '',
  webhookSecret: '',
})

function telegramEnvSet(envVar?: string): boolean {
  return !!(envVar ?? 'TELEGRAM_BOT_TOKEN')
}

async function fetchChannels() {
  channels.value = await $fetch<Channel[]>('/api/channels/config')
}

async function fetchAgents() {
  const list = await $fetch<{ name: string }[]>('/api/agents')
  agents.value = list.map(a => a.name)
}

function openAdd() {
  editing.value = null
  form.value = { name: '', type: 'webhook', defaultAgent: agents.value[0] ?? '_main', botTokenEnv: '', allowedChatIds: '', webhookSecret: '' }
  showModal.value = true
}

function openEdit(ch: Channel) {
  editing.value = ch.name
  form.value = {
    name: ch.name,
    type: ch.config.type,
    defaultAgent: ch.config.defaultAgent,
    botTokenEnv: ch.config.botTokenEnv ?? '',
    allowedChatIds: ch.config.allowedChatIds?.join(', ') ?? '',
    webhookSecret: ch.config.webhookSecret ?? '',
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
}

async function saveChannel() {
  const config: ChannelConfig = {
    type: form.value.type,
    defaultAgent: form.value.defaultAgent,
  }
  if (form.value.type === 'telegram') {
    if (form.value.botTokenEnv) config.botTokenEnv = form.value.botTokenEnv
    if (form.value.allowedChatIds.trim()) {
      config.allowedChatIds = form.value.allowedChatIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    }
  }
  if (form.value.type === 'webhook' && form.value.webhookSecret.trim()) {
    config.webhookSecret = form.value.webhookSecret.trim()
  }

  if (editing.value) {
    await $fetch(`/api/channels/config/${editing.value}`, { method: 'PUT', body: JSON.stringify(config) })
  } else {
    await $fetch(`/api/channels/config/${form.value.name}`, { method: 'POST', body: JSON.stringify(config) })
  }

  closeModal()
  await fetchChannels()
}

function confirmDelete(name: string) {
  deleteTarget.value = name
}

async function doDelete() {
  if (!deleteTarget.value) return
  await $fetch(`/api/channels/config/${deleteTarget.value}`, { method: 'DELETE' })
  deleteTarget.value = null
  await fetchChannels()
}

onMounted(async () => {
  await Promise.all([fetchChannels(), fetchAgents()])
})
</script>

<style scoped>
.page-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.page-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid var(--line); flex-shrink: 0;
}
.page-header-spacer { flex: 1; }
.channels-list { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.empty-state { color: var(--fg-dimmer); font-size: 13px; padding: 40px; text-align: center; }

.channel-card {
  background: var(--bg-1); border: 1px solid var(--line); border-radius: 10px;
  padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;
}
.channel-header { display: flex; align-items: center; gap: 10px; }
.channel-name { font-size: 13px; font-weight: 600; color: var(--fg); }
.channel-agent { font-size: 11.5px; color: var(--fg-dim); }
.channel-card-spacer { flex: 1; }
.channel-type-badge {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.channel-type-badge.webhook { background: rgba(99,190,255,0.12); color: #63beff; border: 1px solid rgba(99,190,255,0.2); }
.channel-type-badge.telegram { background: rgba(0,136,204,0.12); color: #42a5f5; border: 1px solid rgba(66,165,245,0.2); }

.channel-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--fg-dim); }
.meta-label { color: var(--fg-dimmer); }
.code-inline { font-size: 10.5px; color: var(--accent); }
.warn-pill {
  font-size: 11px; padding: 2px 8px; border-radius: 999px;
  background: rgba(255,200,0,0.1); color: var(--warn); border: 1px solid rgba(255,200,0,0.2);
}

.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: var(--bg-1); border: 1px solid var(--line); border-radius: 12px;
  width: 100%; max-width: 480px; display: flex; flex-direction: column;
}
.modal-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border-bottom: 1px solid var(--line);
}
.modal-title { font-size: 14px; font-weight: 600; color: var(--fg); flex: 1; }
.modal-close {
  background: none; border: none; color: var(--fg-dimmer); cursor: pointer; font-size: 16px;
  padding: 0; line-height: 1;
}
.modal-close:hover { color: var(--fg); }
.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 18px; border-top: 1px solid var(--line);
}
.field-group { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 11.5px; color: var(--fg-dim); font-weight: 500; }
.radio-row { display: flex; gap: 16px; }
.radio-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--fg); cursor: pointer; }
.btn.bad { color: var(--bad); border-color: rgba(255,90,90,0.3); }
.btn.bad:hover { background: rgba(255,90,90,0.08); }
</style>
