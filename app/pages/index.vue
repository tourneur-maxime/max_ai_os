<template>
  <div class="visualizer-root">
    <!-- Top UI overlay -->
    <div class="viz-top-bar">
      <div class="viz-brand">
        <span class="badge accent">Max OS — 1</span>
        <span class="viz-subtitle">local-first agentic OS</span>
      </div>
      <div class="viz-stats">
        <span><b>3</b> agents actifs</span>
        <span>·</span>
        <span><b>142</b> events</span>
        <span>·</span>
        <span><b>$0.34</b> today</span>
      </div>
      <div class="viz-actions">
        <button class="btn sm primary" @click="showAddAgent = true">+ Add Agent</button>
        <button class="btn sm" @click="showSettings = true">⚙ Settings</button>
      </div>
    </div>

    <!-- D3 Canvas -->
    <svg ref="svgRef" class="viz-svg"></svg>

    <!-- Tooltip -->
    <div v-if="tooltip.visible" class="viz-tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      <div class="tooltip-name mono">{{ tooltip.agent?.id }}</div>
      <div class="tooltip-status">
        <span :class="['badge', tooltip.agent?.active ? 'good' : '']">
          <span class="dot"></span>
          {{ tooltip.agent?.active ? 'active' : 'idle' }}
        </span>
      </div>
      <div class="tooltip-model mono">{{ tooltip.agent?.model }}</div>
      <div class="tooltip-missions">{{ tooltip.agent?.missions }} missions</div>
      <div v-if="tooltip.agent?.lastAction" class="tooltip-action">{{ tooltip.agent.lastAction }}</div>
    </div>

    <!-- Agent detail panel -->
    <div v-if="selectedAgent" class="agent-panel" :class="{ open: !!selectedAgent }">
      <div class="agent-panel-header">
        <div :class="['av', 'lg', selectedAgent.cls || '']">{{ selectedAgent.av }}</div>
        <div>
          <div class="mono" style="font-size:13px;font-weight:600;color:var(--fg)">{{ selectedAgent.id }}</div>
          <div style="font-size:11px;color:var(--fg-dim)">{{ selectedAgent.model }}</div>
        </div>
        <span :class="['badge', selectedAgent.active ? 'good' : '']" style="margin-left:auto">
          <span class="dot"></span>
          {{ selectedAgent.active ? 'active' : 'idle' }}
        </span>
        <button class="modal-close" @click="selectedAgent = null">✕</button>
      </div>
      <div class="agent-panel-body">
        <div class="section-title">Stats</div>
        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-value">{{ selectedAgent.missions }}</div>
            <div class="stat-label">Missions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ selectedAgent.active ? 'Running' : 'Idle' }}</div>
            <div class="stat-label">Status</div>
          </div>
        </div>
        <div class="section-title">Model</div>
        <div class="mono" style="font-size:12px;color:var(--accent)">{{ selectedAgent.model }}</div>
        <div class="section-title">Recent Events</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div v-for="ev in recentEvents.filter(e => e.agent === selectedAgent?.id || selectedAgent?.id === '_main').slice(0,5)" :key="ev.time + ev.msg" class="console-line" style="opacity:1;font-size:11px;">
            <span class="console-time">{{ ev.time }}</span>
            <span :class="['console-type', ev.type]">{{ ev.typeLabel }}</span>
            <span class="console-msg">{{ ev.msg }}</span>
          </div>
        </div>
        <div style="margin-top:18px;display:flex;gap:8px;">
          <NuxtLink :to="`/agents/${selectedAgent.id}/chat`" class="btn primary sm">Open Chat →</NuxtLink>
          <NuxtLink to="/agents" class="btn sm">Edit Config</NuxtLink>
        </div>
      </div>
    </div>

    <!-- Console -->
    <div class="console-pane viz-console" ref="consoleRef">
      <div v-for="(ev, idx) in consoleEvents" :key="idx" class="console-line">
        <span class="console-time">{{ ev.time }}</span>
        <span :class="['console-type', ev.type]">{{ ev.typeLabel }}</span>
        <span class="console-agent">{{ ev.agent }}</span>
        <span class="console-msg">{{ ev.msg }}</span>
      </div>
    </div>

    <!-- Add Agent modal -->
    <div v-if="showAddAgent" class="modal-overlay" @click.self="showAddAgent = false">
      <div class="modal">
        <div class="modal-header">
          <div style="font-size:14px;font-weight:600;">New Agent</div>
          <button class="modal-close" @click="showAddAgent = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="label">Agent Name</label>
            <input type="text" class="input" placeholder="e.g. writer_01" />
          </div>
          <div class="form-group">
            <label class="label">Model</label>
            <select class="select">
              <option>claude-sonnet-4.5</option>
              <option>claude-opus-4</option>
              <option>gpt-5</option>
              <option>gpt-5-mini</option>
              <option>gpt-4o-mini</option>
            </select>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="btn primary" @click="showAddAgent = false">Create Agent</button>
            <button class="btn ghost" @click="showAddAgent = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings modal -->
    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="modal">
        <div class="modal-header">
          <div style="font-size:14px;font-weight:600;">Settings</div>
          <button class="modal-close" @click="showSettings = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="section-title">Visualizer</div>
          <div class="form-group" style="display:flex;align-items:center;justify-content:space-between;">
            <label class="label" style="margin:0">Show labels</label>
            <label class="toggle"><input type="checkbox" checked /><span class="slider"></span></label>
          </div>
          <div class="form-group" style="display:flex;align-items:center;justify-content:space-between;">
            <label class="label" style="margin:0">Animate connections</label>
            <label class="toggle"><input type="checkbox" checked /><span class="slider"></span></label>
          </div>
          <div class="form-group" style="display:flex;align-items:center;justify-content:space-between;">
            <label class="label" style="margin:0">Auto-simulate events</label>
            <label class="toggle"><input type="checkbox" checked /><span class="slider"></span></label>
          </div>
          <button class="btn primary" style="margin-top:12px;" @click="showSettings = false">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

definePageMeta({ layout: 'default' })

const svgRef = ref<SVGSVGElement | null>(null)
const consoleRef = ref<HTMLDivElement | null>(null)
const selectedAgent = ref<any>(null)
const showAddAgent = ref(false)
const showSettings = ref(false)

const tooltip = ref({ visible: false, x: 0, y: 0, agent: null as any })

const agentData = [
  { id: '_main', active: true, missions: 142, model: 'gpt-5-mini', av: '_M', cls: 'salmon' },
  { id: 'researcher_42', active: true, missions: 38, model: 'gpt-5', av: 'R', cls: 'blue' },
  { id: 'coder_07', active: true, missions: 67, model: 'claude-sonnet-4.5', av: 'C', cls: 'green' },
  { id: 'reviewer_19', active: false, missions: 24, model: 'gpt-5-mini', av: 'Rv', cls: '' },
  { id: 'memory_03', active: false, missions: 191, model: 'gpt-4o-mini', av: 'M', cls: 'purple' },
  { id: 'shell_01', active: false, missions: 14, model: 'gpt-4o-mini', av: 'Sh', cls: '' },
  { id: 'planner_04', active: false, missions: 9, model: 'claude-opus-4', av: 'Pl', cls: '' },
]

const EVENT_POOL = [
  { type: 'pre', typeLabel: 'PreToolUse', agent: 'coder_07', msg: 'edit_file src/Kanban.tsx' },
  { type: 'post', typeLabel: 'PostToolUse', agent: 'coder_07', msg: '412 lines · 14ms' },
  { type: 'pre', typeLabel: 'PreToolUse', agent: 'researcher_42', msg: 'web_search "WebAuthn mobile"' },
  { type: 'stop', typeLabel: 'Stop', agent: 'memory_03', msg: 'natural stop · M-218 done' },
  { type: 'spawn', typeLabel: 'PreToolUse', agent: '_main', msg: 'spawn planner_04' },
  { type: 'pre', typeLabel: 'PreToolUse', agent: 'coder_07', msg: 'read_file src/Auth.ts' },
  { type: 'post', typeLabel: 'PostToolUse', agent: 'researcher_42', msg: '3 results found · 42ms' },
  { type: 'pre', typeLabel: 'PreToolUse', agent: '_main', msg: 'task_complete M-219' },
  { type: 'stop', typeLabel: 'Stop', agent: 'coder_07', msg: 'interrupted · awaiting review' },
  { type: 'post', typeLabel: 'PostToolUse', agent: 'planner_04', msg: 'plan created · 8 tasks' },
]

const consoleEvents = ref<any[]>([])
const recentEvents = ref<any[]>([])

let eventInterval: ReturnType<typeof setInterval> | null = null
let simulation: any = null

function getTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
}

function addEvent() {
  const ev = { ...EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)], time: getTime() }
  consoleEvents.value.push(ev)
  recentEvents.value.push(ev)
  if (consoleEvents.value.length > 60) consoleEvents.value.shift()
  if (recentEvents.value.length > 30) recentEvents.value.shift()
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight
    }
  })
}

// Seed initial events
for (let i = 0; i < 8; i++) {
  const ev = { ...EVENT_POOL[i % EVENT_POOL.length], time: getTime() }
  consoleEvents.value.push(ev)
  recentEvents.value.push(ev)
}

onMounted(async () => {
  const d3 = await import('d3')
  const svg = d3.select(svgRef.value!)
  const width = window.innerWidth
  const height = window.innerHeight - 52 - 160 // nav + console

  svg.attr('width', width).attr('height', height)

  // Dot grid background
  const defs = svg.append('defs')
  const pattern = defs.append('pattern')
    .attr('id', 'dotgrid')
    .attr('width', 24).attr('height', 24)
    .attr('patternUnits', 'userSpaceOnUse')
  pattern.append('circle')
    .attr('cx', 1.5).attr('cy', 1.5).attr('r', 0.8)
    .attr('fill', 'rgba(255,255,255,0.06)')

  svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#dotgrid)')

  // Glow filter
  const glow = defs.append('filter').attr('id', 'glow')
  glow.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'coloredBlur')
  const feMerge = glow.append('feMerge')
  feMerge.append('feMergeNode').attr('in', 'coloredBlur')
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

  const greenGlow = defs.append('filter').attr('id', 'greenGlow')
  greenGlow.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'coloredBlur')
  const feMerge2 = greenGlow.append('feMerge')
  feMerge2.append('feMergeNode').attr('in', 'coloredBlur')
  feMerge2.append('feMergeNode').attr('in', 'SourceGraphic')

  const nodes: any[] = agentData.map(a => ({ ...a }))
  const links: any[] = nodes.filter(n => n.id !== '_main').map(n => ({ source: '_main', target: n.id }))

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d: any) => d.id).distance(160).strength(0.5))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius((d: any) => d.id === '_main' ? 80 : 60))

  // Draw links
  const link = svg.append('g').attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', 'rgba(255,255,255,0.12)')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,8')

  // Animated active links
  const activeLink = svg.append('g').attr('class', 'active-links')
    .selectAll('line')
    .data(links.filter((l: any) => {
      const target = nodes.find(n => n.id === (typeof l.target === 'object' ? l.target.id : l.target))
      return target?.active
    }))
    .join('line')
    .attr('stroke', 'rgba(224,122,95,0.35)')
    .attr('stroke-width', 1.5)

  // Draw nodes
  const nodeG = svg.append('g').attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node-group')
    .style('cursor', 'pointer')
    .call(d3.drag<SVGGElement, any>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null; d.fy = null
      })
    )

  // Pulse ring for active nodes
  nodeG.filter((d: any) => d.active)
    .append('circle')
    .attr('class', 'pulse-ring')
    .attr('r', (d: any) => d.id === '_main' ? 80 : 55)
    .attr('fill', 'none')
    .attr('stroke', '#7BD389')
    .attr('stroke-width', 1)
    .attr('opacity', 0.5)
    .style('filter', 'url(#greenGlow)')

  // Outer halo
  nodeG.append('circle')
    .attr('r', (d: any) => d.id === '_main' ? 68 : 48)
    .attr('fill', 'none')
    .attr('stroke', (d: any) => d.active ? 'rgba(123,211,137,0.2)' : 'rgba(255,255,255,0.04)')
    .attr('stroke-width', 1)

  // Main circle (flat fill, no CSS gradient in SVG attr)
  nodeG.append('circle')
    .attr('r', (d: any) => d.id === '_main' ? 56 : 38)
    .attr('fill', (d: any) => {
      if (d.id === '_main') return '#1a130f'
      if (d.active) return '#0f1a0f'
      return '#141414'
    })
    .attr('stroke', (d: any) => {
      if (d.id === '_main') return 'rgba(224,122,95,0.6)'
      if (d.active) return 'rgba(123,211,137,0.5)'
      return 'rgba(255,255,255,0.1)'
    })
    .attr('stroke-width', (d: any) => d.id === '_main' ? 2 : 1.5)
    .style('filter', (d: any) => d.active ? 'url(#glow)' : 'none')

  // ID label
  nodeG.append('text')
    .text((d: any) => d.id === '_main' ? '_main' : d.id.split('_')[0])
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('fill', (d: any) => d.id === '_main' ? '#E07A5F' : d.active ? '#7BD389' : '#8a8a8a')
    .attr('font-family', 'JetBrains Mono, monospace')
    .attr('font-size', (d: any) => d.id === '_main' ? '12px' : '10px')
    .attr('font-weight', '700')
    .style('pointer-events', 'none')

  // Model label below
  nodeG.append('text')
    .text((d: any) => d.model.split('-').slice(0, 2).join('-'))
    .attr('text-anchor', 'middle')
    .attr('dy', (d: any) => d.id === '_main' ? '2.2em' : '1.8em')
    .attr('fill', '#5a5a5a')
    .attr('font-family', 'JetBrains Mono, monospace')
    .attr('font-size', '8px')
    .style('pointer-events', 'none')

  // Status dot
  nodeG.append('circle')
    .attr('r', 5)
    .attr('cx', (d: any) => d.id === '_main' ? 36 : 24)
    .attr('cy', (d: any) => d.id === '_main' ? -36 : -24)
    .attr('fill', (d: any) => d.active ? '#7BD389' : '#5a5a5a')
    .style('filter', (d: any) => d.active ? 'drop-shadow(0 0 4px rgba(123,211,137,0.5))' : 'none')

  // Hover events
  nodeG
    .on('mouseover', (event, d: any) => {
      tooltip.value = {
        visible: true,
        x: event.clientX + 14,
        y: event.clientY - 10,
        agent: d
      }
    })
    .on('mousemove', (event) => {
      tooltip.value.x = event.clientX + 14
      tooltip.value.y = event.clientY - 10
    })
    .on('mouseout', () => {
      tooltip.value.visible = false
    })
    .on('click', (event, d: any) => {
      selectedAgent.value = d
      tooltip.value.visible = false
    })

  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)

    activeLink
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)

    nodeG.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
  })

  // Animate pulse rings
  function animatePulse() {
    svg.selectAll('.pulse-ring')
      .transition().duration(2000).ease(d3.easeSinInOut)
      .attr('opacity', 0.2)
      .attr('r', function(d: any) { return d.id === '_main' ? 90 : 65 })
      .transition().duration(2000).ease(d3.easeSinInOut)
      .attr('opacity', 0.5)
      .attr('r', function(d: any) { return d.id === '_main' ? 80 : 55 })
      .on('end', animatePulse)
  }
  animatePulse()

  // Start event simulation
  eventInterval = setInterval(() => {
    addEvent()
  }, 2000 + Math.random() * 1000)

  // Resize
  window.addEventListener('resize', () => {
    const w = window.innerWidth
    const h = window.innerHeight - 52 - 160
    svg.attr('width', w).attr('height', h)
    simulation.force('center', d3.forceCenter(w / 2, h / 2))
    simulation.alpha(0.3).restart()
  })
})

onUnmounted(() => {
  if (eventInterval) clearInterval(eventInterval)
  if (simulation) simulation.stop()
})
</script>

<style scoped>
.visualizer-root {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
}

.viz-svg {
  flex: 1;
  display: block;
}

.viz-top-bar {
  position: absolute;
  top: 14px;
  left: 0; right: 0;
  display: flex;
  align-items: center;
  padding: 0 22px;
  gap: 18px;
  z-index: 10;
  pointer-events: none;
}
.viz-top-bar > * { pointer-events: all; }

.viz-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.viz-subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--fg-dim);
}

.viz-stats {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg-dim);
  background: rgba(15,15,15,0.8);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 6px 16px;
  backdrop-filter: blur(8px);
}
.viz-stats b { color: var(--fg); }
.viz-stats span { display: flex; align-items: center; }

.viz-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.viz-console {
  height: 160px;
  flex-shrink: 0;
  z-index: 10;
}

.viz-tooltip {
  position: fixed;
  z-index: 60;
  background: rgba(20,20,20,0.95);
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 10px 13px;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  min-width: 160px;
}
.tooltip-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--fg);
  margin-bottom: 5px;
}
.tooltip-model {
  font-size: 10.5px;
  color: var(--accent);
  margin-top: 4px;
}
.tooltip-missions {
  font-size: 10.5px;
  color: var(--fg-dim);
  margin-top: 2px;
}
.tooltip-action {
  font-size: 10px;
  color: var(--fg-dimmer);
  margin-top: 4px;
  font-family: 'JetBrains Mono', monospace;
}

.agent-panel {
  position: fixed;
  top: 52px;
  right: 0;
  bottom: 160px;
  width: 360px;
  background: var(--bg-1);
  border-left: 1px solid var(--line-2);
  z-index: 40;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.25s ease;
  box-shadow: -16px 0 48px rgba(0,0,0,0.4);
}
.agent-panel.open {
  transform: translateX(0);
}
.agent-panel-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.agent-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>
