<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <div class="page-title">Remote Control</div>
        <div class="page-sub">Tokens JWT pour l'API distante (Tailscale, scripts)</div>
      </div>
      <div class="page-header-spacer"></div>
      <button class="btn primary" @click="showIssueModal = true">+ Issue token</button>
    </div>

    <!-- Endpoint info -->
    <div class="info-band">
      <div class="info-item">
        <span class="info-label">Endpoint</span>
        <span class="mono code-inline">{{ baseUrl }}/api/remote/missions</span>
      </div>
      <div class="info-item">
        <a :href="baseUrl + '/api/remote/openapi.json'" target="_blank" class="btn sm">OpenAPI spec ↗</a>
      </div>
    </div>

    <!-- Tokens list -->
    <div class="tokens-list">
      <div v-if="tokens.length === 0" class="empty-state">
        Aucun token actif. Créez un token pour piloter l'orchestrateur depuis l'extérieur.
      </div>

      <div class="tokens-table-wrap" v-if="tokens.length > 0">
        <table class="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Créé le</th>
              <th>Expire le</th>
              <th>Appels</th>
              <th>Dernier appel</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tokens" :key="t.id">
              <td style="font-weight:600;color:var(--fg)">{{ t.client_name }}</td>
              <td class="mono" style="font-size:11px;color:var(--fg-dim)">{{ formatDate(t.created_at) }}</td>
              <td class="mono" style="font-size:11px;" :class="isExpired(t.expires_at) ? 'bad-text' : 'fg-dim-text'">
                {{ formatDate(t.expires_at) }}
                <span v-if="isExpired(t.expires_at)" class="badge bad" style="margin-left:4px;font-size:9px;">expiré</span>
              </td>
              <td class="mono" style="font-size:11px;color:var(--fg-dim)">{{ t.call_count }}</td>
              <td class="mono" style="font-size:11px;color:var(--fg-dim)">{{ t.last_called_at ? formatDate(t.last_called_at) : '—' }}</td>
              <td>
                <button class="btn sm bad" @click="revokeToken(t.id)">Revoke</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Issue token modal -->
    <div v-if="showIssueModal" class="modal-backdrop" @click.self="closeIssueModal">
      <div class="modal-box" style="max-width:420px;">
        <div class="modal-header">
          <div class="modal-title">Émettre un token</div>
          <button class="modal-close" @click="closeIssueModal">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="!newToken">
            <div class="field-group">
              <label class="field-label">Nom du client</label>
              <input v-model="clientName" type="text" class="input" placeholder="ex: tailscale-home, script-backup" @keydown.enter="issueToken" />
            </div>
            <p style="font-size:11.5px;color:var(--fg-dimmer);margin-top:8px;">
              Le token est valable 24h. Il sera affiché une seule fois — notez-le immédiatement.
            </p>
          </div>
          <div v-else class="token-display">
            <div class="token-label">Token généré (copiez-le maintenant)</div>
            <div class="token-value mono" @click="copyToken">{{ newToken }}</div>
            <div class="token-hint">Cliquez pour copier · Affiché une seule fois</div>
            <div v-if="copied" class="copied-badge">✓ Copié !</div>
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="!newToken" class="btn" @click="closeIssueModal">Annuler</button>
          <button v-if="!newToken" class="btn primary" @click="issueToken" :disabled="!clientName.trim()">Émettre</button>
          <button v-else class="btn primary" @click="closeIssueModal">Fermer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRuntimeConfig } from '#app'

definePageMeta({ layout: 'default' })

const { $fetch } = useApi()
const config = useRuntimeConfig()
const baseUrl = computed(() => config.public.apiBase as string ?? 'http://localhost:9000')

interface RemoteToken {
  id: string
  client_name: string
  created_at: number
  expires_at: number
  call_count: number
  last_called_at?: number
}

const tokens = ref<RemoteToken[]>([])
const showIssueModal = ref(false)
const clientName = ref('')
const newToken = ref('')
const copied = ref(false)

function formatDate(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isExpired(ts: number): boolean {
  return Date.now() / 1000 > ts
}

async function fetchTokens() {
  tokens.value = await $fetch<RemoteToken[]>('/api/remote/tokens')
}

async function issueToken() {
  if (!clientName.value.trim()) return
  const res = await $fetch<{ token: string }>('/api/remote/issue-token', {
    method: 'POST',
    body: JSON.stringify({ client_name: clientName.value.trim() }),
  })
  newToken.value = res.token
  await fetchTokens()
}

async function revokeToken(id: string) {
  await $fetch(`/api/remote/tokens/${id}`, { method: 'DELETE' })
  await fetchTokens()
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(newToken.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* ignore */ }
}

function closeIssueModal() {
  showIssueModal.value = false
  clientName.value = ''
  newToken.value = ''
  copied.value = false
}

onMounted(fetchTokens)
</script>

<style scoped>
.page-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.page-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid var(--line); flex-shrink: 0;
}
.page-header-spacer { flex: 1; }
.info-band {
  display: flex; align-items: center; gap: 20px;
  padding: 12px 20px; border-bottom: 1px solid var(--line);
  background: rgba(255,255,255,0.02); flex-shrink: 0;
}
.info-item { display: flex; align-items: center; gap: 10px; }
.info-label { font-size: 11.5px; color: var(--fg-dimmer); }
.code-inline { font-size: 11.5px; color: var(--accent); }
.tokens-list { padding: 20px; flex: 1; }
.tokens-table-wrap { overflow-x: auto; }
.empty-state { color: var(--fg-dimmer); font-size: 13px; padding: 40px; text-align: center; }
.bad-text { color: var(--bad) !important; }
.fg-dim-text { color: var(--fg-dim); }

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
  background: none; border: none; color: var(--fg-dimmer); cursor: pointer; font-size: 16px; padding: 0;
}
.modal-close:hover { color: var(--fg); }
.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 18px; border-top: 1px solid var(--line);
}
.field-group { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 11.5px; color: var(--fg-dim); font-weight: 500; }

.token-display { display: flex; flex-direction: column; gap: 8px; }
.token-label { font-size: 12px; color: var(--fg-dim); }
.token-value {
  word-break: break-all; font-size: 11px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  border-radius: 6px; padding: 10px 12px; color: var(--accent);
  cursor: pointer; transition: background 0.15s;
}
.token-value:hover { background: rgba(255,255,255,0.07); }
.token-hint { font-size: 11px; color: var(--fg-dimmer); }
.copied-badge { font-size: 11.5px; color: var(--good); font-weight: 600; }
.btn.bad { color: var(--bad); border-color: rgba(255,90,90,0.3); }
.btn.bad:hover { background: rgba(255,90,90,0.08); }
</style>
