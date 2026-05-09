<template>
  <div class="page-content">
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">Missions</div>
        <div class="page-sub">All agent missions · 218 this month</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px;">
        <button class="btn sm">Export CSV</button>
      </div>
    </div>

    <!-- Stats row -->
    <div class="stats-band">
      <div class="stat-card">
        <div class="stat-value">218</div>
        <div class="stat-label">Missions this month</div>
      </div>
      <div class="stat-card featured">
        <div class="stat-value">$24.18</div>
        <div class="stat-label">Total cost</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">4.7M</div>
        <div class="stat-label">Tokens used</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">4m 12s</div>
        <div class="stat-label">Avg duration</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-band">
      <div class="filter-pills">
        <button v-for="f in filters" :key="f" :class="['filter-pill', { active: activeFilter === f }]" @click="activeFilter = f">{{ f }}</button>
      </div>
      <input v-model="search" type="text" class="input" style="width:220px;" placeholder="Search missions…" />
    </div>

    <!-- Main content: table + panel -->
    <div class="missions-body">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Agent</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Cost</th>
              <th>Tokens</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in filteredMissions"
              :key="m.id"
              :class="{ selected: selectedMission?.id === m.id }"
              @click="selectedMission = m"
              style="cursor:pointer"
            >
              <td class="mono" style="color:var(--fg-dimmer);font-size:10.5px;">{{ m.id }}</td>
              <td style="color:var(--fg);font-size:12.5px;max-width:280px;">{{ m.title }}</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span :class="['av', m.agentCls]" style="width:18px;height:18px;font-size:8px;">{{ m.agentAv }}</span>
                  <span class="mono" style="font-size:11px;">{{ m.agent }}</span>
                </div>
              </td>
              <td class="mono" style="font-size:11px;color:var(--fg-dim)">{{ m.started }}</td>
              <td class="mono" style="font-size:11px;color:var(--fg-dim)">{{ m.duration }}</td>
              <td class="mono" style="font-size:11px;color:var(--accent)">{{ m.cost }}</td>
              <td class="mono" style="font-size:11px;color:var(--fg-dim)">{{ m.tokens }}</td>
              <td>
                <span :class="['badge', m.statusCls]">
                  <span class="dot"></span>
                  {{ m.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail panel -->
      <div :class="['slideover', { open: !!selectedMission }]">
        <div v-if="selectedMission" class="slideover-header">
          <div :class="['av', 'lg', selectedMission.agentCls]">{{ selectedMission.agentAv }}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ selectedMission.title }}</div>
            <div class="mono" style="font-size:10.5px;color:var(--fg-dimmer)">{{ selectedMission.id }}</div>
          </div>
          <span :class="['badge', selectedMission.statusCls]">
            <span class="dot"></span>
            {{ selectedMission.status }}
          </span>
          <button class="modal-close" @click="selectedMission = null">✕</button>
        </div>
        <div v-if="selectedMission" class="slideover-body">
          <!-- Mini stats -->
          <div class="stat-row" style="margin-bottom:16px;">
            <div class="stat-card" style="flex:none;padding:10px 14px;">
              <div class="stat-value" style="font-size:16px;">{{ selectedMission.cost }}</div>
              <div class="stat-label">Cost</div>
            </div>
            <div class="stat-card" style="flex:none;padding:10px 14px;">
              <div class="stat-value" style="font-size:16px;">{{ selectedMission.tokens }}</div>
              <div class="stat-label">Tokens</div>
            </div>
            <div class="stat-card" style="flex:none;padding:10px 14px;">
              <div class="stat-value" style="font-size:16px;">{{ selectedMission.duration }}</div>
              <div class="stat-label">Duration</div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs-header">
            <button v-for="t in tabs" :key="t" :class="['tab-btn', { active: activeTab === t }]" @click="activeTab = t">{{ t }}</button>
          </div>

          <div style="margin-top:16px;">
            <!-- Timeline tab -->
            <div v-if="activeTab === 'Timeline'" class="timeline">
              <div v-for="ev in selectedMission.events" :key="ev.time + ev.msg" class="timeline-event">
                <div :class="['tl-dot', ev.type]"></div>
                <div class="tl-content">
                  <div class="tl-time mono">{{ ev.time }}</div>
                  <div class="tl-type">{{ ev.typeLabel }}</div>
                  <div class="tl-msg">{{ ev.msg }}</div>
                </div>
              </div>
            </div>

            <!-- Output tab -->
            <div v-if="activeTab === 'Output'" class="mission-output">
              <div v-html="selectedMission.output"></div>
            </div>

            <!-- Logs tab -->
            <div v-if="activeTab === 'Logs'" class="code-block" style="font-size:11px;">{{ selectedMission.logs }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'default' })

const search = ref('')
const activeFilter = ref('All')
const selectedMission = ref<any>(null)
const activeTab = ref('Timeline')

const filters = ['All', 'Active', 'Done', 'Failed', 'Interrupted']
const tabs = ['Timeline', 'Output', 'Logs']

const missions = [
  {
    id: 'M-218', title: 'Update Kanban component with DnD', agent: 'coder_07', agentAv: 'C', agentCls: 'green',
    started: '09:14', duration: '3m 42s', cost: '$0.18', tokens: '84k', status: 'done', statusCls: 'good',
    events: [
      { type: 'pre', typeLabel: 'PreToolUse', time: '09:14:02', msg: 'read_file src/Kanban.tsx' },
      { type: 'post', typeLabel: 'PostToolUse', time: '09:14:03', msg: '412 lines read · 8ms' },
      { type: 'pre', typeLabel: 'PreToolUse', time: '09:14:18', msg: 'write_file src/Kanban.tsx' },
      { type: 'post', typeLabel: 'PostToolUse', time: '09:14:19', msg: 'file updated · 14ms' },
      { type: 'stop', typeLabel: 'Stop', time: '09:17:44', msg: 'natural stop · mission complete' },
    ],
    output: '<h3>Mission Complete</h3><p>Updated <code>src/Kanban.tsx</code> with native HTML5 drag-and-drop. Added column drop zones, card dragging, and visual feedback during drag operations. 412 → 489 lines.</p>',
    logs: JSON.stringify({ mission: 'M-218', agent: 'coder_07', events: 5, tokens_in: 62140, tokens_out: 21820, cost_usd: 0.18 }, null, 2)
  },
  {
    id: 'M-217', title: 'Research WebAuthn for mobile auth', agent: 'researcher_42', agentAv: 'R', agentCls: 'blue',
    started: '08:52', duration: '6m 18s', cost: '$0.42', tokens: '210k', status: 'done', statusCls: 'good',
    events: [
      { type: 'pre', typeLabel: 'PreToolUse', time: '08:52:01', msg: 'web_search "WebAuthn mobile 2024"' },
      { type: 'post', typeLabel: 'PostToolUse', time: '08:52:08', msg: '12 results · 240ms' },
      { type: 'pre', typeLabel: 'PreToolUse', time: '08:53:14', msg: 'web_fetch developer.mozilla.org/WebAuthn' },
      { type: 'stop', typeLabel: 'Stop', time: '08:58:19', msg: 'natural stop · report written' },
    ],
    output: '<h3>WebAuthn Research Summary</h3><p>WebAuthn is supported on 97% of modern mobile browsers. Key findings: passkeys offer best UX, FIDO2 requires server-side implementation, React Native support via <code>@simplewebauthn/browser</code>.</p>',
    logs: JSON.stringify({ mission: 'M-217', agent: 'researcher_42', events: 14, tokens_in: 168420, tokens_out: 41580, cost_usd: 0.42 }, null, 2)
  },
  {
    id: 'M-216', title: 'Review PR #142 — Auth refactor', agent: 'reviewer_19', agentAv: 'Rv', agentCls: '',
    started: '08:30', duration: '2m 05s', cost: '$0.09', tokens: '42k', status: 'done', statusCls: 'good',
    events: [
      { type: 'pre', typeLabel: 'PreToolUse', time: '08:30:01', msg: 'read_file src/auth/index.ts' },
      { type: 'post', typeLabel: 'PostToolUse', time: '08:30:02', msg: 'file read · 6ms' },
      { type: 'stop', typeLabel: 'Stop', time: '08:32:05', msg: 'natural stop · review posted' },
    ],
    output: '<h3>PR #142 Review</h3><p>Code quality: good. Found 2 minor issues: missing error handling in <code>refreshToken()</code>, potential race condition in concurrent auth calls. Approved with suggestions.</p>',
    logs: JSON.stringify({ mission: 'M-216', agent: 'reviewer_19', events: 6, tokens_in: 34200, tokens_out: 7800, cost_usd: 0.09 }, null, 2)
  },
  {
    id: 'M-215', title: 'Write blog post on agentic systems', agent: '_main', agentAv: '_M', agentCls: 'salmon',
    started: '07:45', duration: '11m 30s', cost: '$0.94', tokens: '482k', status: 'done', statusCls: 'good',
    events: [
      { type: 'spawn', typeLabel: 'PreToolUse', time: '07:45:01', msg: 'spawn researcher_42 · context gathering' },
      { type: 'post', typeLabel: 'PostToolUse', time: '07:52:14', msg: 'research done · 3200 tokens' },
      { type: 'stop', typeLabel: 'Stop', time: '07:56:30', msg: 'natural stop · blog post saved' },
    ],
    output: '<h3>Blog Post Draft</h3><p>"The Rise of Local-First Agentic Systems" — 1,842 words written. Covers: architecture patterns, cost optimization, privacy benefits of local execution. Ready for review.</p>',
    logs: JSON.stringify({ mission: 'M-215', agent: '_main', events: 22, tokens_in: 384000, tokens_out: 98000, cost_usd: 0.94 }, null, 2)
  },
  {
    id: 'M-214', title: 'Fix TypeScript errors in dashboard', agent: 'coder_07', agentAv: 'C', agentCls: 'green',
    started: '07:10', duration: '4m 52s', cost: '$0.22', tokens: '108k', status: 'done', statusCls: 'good',
    events: [
      { type: 'pre', typeLabel: 'PreToolUse', time: '07:10:01', msg: 'run_command tsc --noEmit' },
      { type: 'post', typeLabel: 'PostToolUse', time: '07:10:04', msg: '14 errors found' },
      { type: 'stop', typeLabel: 'Stop', time: '07:14:53', msg: 'natural stop · 0 errors' },
    ],
    output: '<h3>TypeScript Fix</h3><p>Fixed 14 type errors in dashboard components. Main issues: missing type annotations on D3 callbacks, incorrect generic types on Pinia stores. All types now strict-compliant.</p>',
    logs: JSON.stringify({ mission: 'M-214', agent: 'coder_07', events: 18, tokens_in: 84200, tokens_out: 23800, cost_usd: 0.22 }, null, 2)
  },
  {
    id: 'M-213', title: 'Update memory patterns from last session', agent: 'memory_03', agentAv: 'M', agentCls: 'purple',
    started: '06:00', duration: '1m 14s', cost: '$0.04', tokens: '18k', status: 'done', statusCls: 'good',
    events: [
      { type: 'pre', typeLabel: 'PreToolUse', time: '06:00:01', msg: 'read_file ~/agents/_main/memory/patterns.md' },
      { type: 'stop', typeLabel: 'Stop', time: '06:01:14', msg: 'natural stop · patterns updated' },
    ],
    output: '<h3>Memory Update</h3><p>Added 3 new behavioral patterns detected from session 2026-05-07. Updated cost optimization heuristics. Memory usage: 34k / 100k tokens.</p>',
    logs: JSON.stringify({ mission: 'M-213', agent: 'memory_03', events: 4, tokens_in: 14400, tokens_out: 3600, cost_usd: 0.04 }, null, 2)
  },
  {
    id: 'M-212', title: 'Plan sprint tasks for week 19', agent: 'planner_04', agentAv: 'Pl', agentCls: '',
    started: 'May 7', duration: '8m 02s', cost: '$0.56', tokens: '284k', status: 'done', statusCls: 'good',
    events: [
      { type: 'pre', typeLabel: 'PreToolUse', time: '09:00:01', msg: 'read_file ~/projects/backlog.md' },
      { type: 'stop', typeLabel: 'Stop', time: '09:08:02', msg: 'natural stop · sprint planned' },
    ],
    output: '<h3>Sprint 19 Plan</h3><p>22 tasks identified, 14 scheduled for this week. Priority: WebAuthn auth (5 tasks), Dashboard D3 charts (4 tasks), Memory compaction (3 tasks). Estimated cost: $2.40.</p>',
    logs: JSON.stringify({ mission: 'M-212', agent: 'planner_04', events: 12, tokens_in: 224000, tokens_out: 60000, cost_usd: 0.56 }, null, 2)
  },
  {
    id: 'M-211', title: 'Shell: cleanup old log files', agent: 'shell_01', agentAv: 'Sh', agentCls: '',
    started: 'May 7', duration: '0m 18s', cost: '$0.01', tokens: '4k', status: 'done', statusCls: 'good',
    events: [
      { type: 'pre', typeLabel: 'PreToolUse', time: '23:00:01', msg: 'run_command find ~/logs -mtime +30 -delete' },
      { type: 'stop', typeLabel: 'Stop', time: '23:00:18', msg: 'natural stop · 42 files deleted' },
    ],
    output: '<h3>Cleanup Done</h3><p>Deleted 42 log files older than 30 days. Freed 284MB disk space.</p>',
    logs: JSON.stringify({ mission: 'M-211', agent: 'shell_01', events: 2, tokens_in: 3200, tokens_out: 800, cost_usd: 0.01 }, null, 2)
  },
  {
    id: 'M-210', title: 'Debug production error in API gateway', agent: 'coder_07', agentAv: 'C', agentCls: 'green',
    started: 'May 7', duration: '18m 44s', cost: '$1.24', tokens: '640k', status: 'interrupted', statusCls: 'warn',
    events: [
      { type: 'pre', typeLabel: 'PreToolUse', time: '14:22:01', msg: 'read_file src/gateway/index.ts' },
      { type: 'stop', typeLabel: 'Stop', time: '14:40:44', msg: 'interrupted · user cancelled' },
    ],
    output: '<h3>Debug Session</h3><p>Identified 3 potential causes for the 504 timeout. Root cause appears to be in the Redis connection pooling. Session interrupted before fix was complete.</p>',
    logs: JSON.stringify({ mission: 'M-210', agent: 'coder_07', events: 34, tokens_in: 504000, tokens_out: 136000, cost_usd: 1.24, status: 'interrupted' }, null, 2)
  },
  {
    id: 'M-209', title: 'Summarize research on RAG architectures', agent: 'researcher_42', agentAv: 'R', agentCls: 'blue',
    started: 'May 6', duration: '9m 22s', cost: '$0.68', tokens: '340k', status: 'done', statusCls: 'good',
    events: [
      { type: 'pre', typeLabel: 'PreToolUse', time: '10:15:01', msg: 'web_search "RAG architecture 2024 best practices"' },
      { type: 'stop', typeLabel: 'Stop', time: '10:24:22', msg: 'natural stop · summary saved' },
    ],
    output: '<h3>RAG Architecture Summary</h3><p>Key findings: hybrid search (BM25 + dense vectors) outperforms pure dense by 12%, re-ranking with cross-encoders adds 8% relevance, chunk size 512 tokens optimal for most tasks.</p>',
    logs: JSON.stringify({ mission: 'M-209', agent: 'researcher_42', events: 16, tokens_in: 272000, tokens_out: 68000, cost_usd: 0.68 }, null, 2)
  },
]

const filteredMissions = computed(() => {
  let ms = missions
  if (activeFilter.value !== 'All') {
    const statusMap: Record<string, string> = {
      'Active': 'active', 'Done': 'done', 'Failed': 'failed', 'Interrupted': 'interrupted'
    }
    ms = ms.filter(m => m.status === statusMap[activeFilter.value])
  }
  if (search.value) {
    const q = search.value.toLowerCase()
    ms = ms.filter(m => m.title.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.agent.toLowerCase().includes(q))
  }
  return ms
})
</script>

<style scoped>
.page-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.stats-band {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.stats-band .stat-card {
  padding: 10px 16px;
}
.filters-band {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.missions-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
}
.table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}
.page-header {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 20px;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: var(--line);
}
.timeline-event {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  position: relative;
}
.tl-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 3px;
  position: absolute;
  left: -20px;
  border: 2px solid var(--bg-1);
}
.tl-dot.pre { background: var(--info); }
.tl-dot.post { background: var(--good); }
.tl-dot.stop { background: var(--warn); }
.tl-dot.spawn { background: var(--accent); }
.tl-content { flex: 1; }
.tl-time { font-size: 10px; color: var(--fg-dimmer); margin-bottom: 1px; }
.tl-type { font-size: 11px; font-weight: 600; color: var(--fg); }
.tl-msg { font-size: 11.5px; color: var(--fg-dim); margin-top: 1px; }
.mission-output {
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg-dim);
}
.mission-output :deep(h3) { font-size: 13px; font-weight: 600; color: var(--fg); margin: 0 0 8px; }
.mission-output :deep(p) { margin: 0 0 8px; }
.mission-output :deep(code) { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; background: rgba(255,255,255,0.07); padding: 1px 5px; border-radius: 3px; color: var(--accent); }
</style>
