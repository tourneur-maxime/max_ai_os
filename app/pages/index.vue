<template>
  <div class="visualizer-root">
    <!-- Top UI overlay -->
    <div class="viz-top-bar">
      <div class="viz-brand">
        <span class="badge accent">Max OS — 1</span>
        <span class="viz-subtitle">local-first agentic OS</span>
      </div>
      <div class="viz-stats">
        <span><b>{{ activeAgentCount }}</b> agents actifs</span>
        <span>·</span>
        <span><b>{{ consoleEvents.length }}</b> events</span>
        <span>·</span>
        <span><b>${{ todayCost.toFixed(4) }}</b> today</span>
      </div>
      <div class="viz-actions">
        <NuxtLink to="/agents" class="btn sm primary">+ Agents</NuxtLink>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

definePageMeta({ layout: 'default' })

const { $fetch, useSSE } = useApi()

interface AgentNode {
  id: string
  active: boolean
  missions: number
  model: string
  av: string
  cls: string
  lastAction?: string | null
}

interface ConsoleEvent {
  type: string
  typeLabel: string
  agent: string
  msg: string
  time: string
}

const svgRef = ref<SVGSVGElement | null>(null)
const consoleRef = ref<HTMLDivElement | null>(null)
const selectedAgent = ref<AgentNode | null>(null)
const tooltip = ref({ visible: false, x: 0, y: 0, agent: null as AgentNode | null })
const consoleEvents = ref<ConsoleEvent[]>([])
const recentEvents = ref<ConsoleEvent[]>([])
const agentData = ref<AgentNode[]>([])
const todayCost = ref(0)
let sseClose: (() => void) | null = null
let simulation: ReturnType<typeof import('d3').then> | null = null

const activeAgentCount = computed(() => agentData.value.filter(a => a.active).length)

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

function getTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}

function addConsoleEvent(ev: ConsoleEvent) {
  consoleEvents.value.push(ev)
  recentEvents.value.push(ev)
  if (consoleEvents.value.length > 60) consoleEvents.value.shift()
  if (recentEvents.value.length > 30) recentEvents.value.shift()
  nextTick(() => {
    if (consoleRef.value) consoleRef.value.scrollTop = consoleRef.value.scrollHeight
  })
}

function streamEventToConsole(data: Record<string, unknown>): ConsoleEvent | null {
  const missionId = (data.missionId as string) ?? ''
  const agentName = agentData.value.find(a => missionId.startsWith(a.id.slice(0, 3)))?.id ?? missionId

  if (data.type === 'assistant') {
    const content = (data.message as { content?: { type: string; text?: string; name?: string }[] })?.content ?? []
    const toolUse = content.find(b => b.type === 'tool_use')
    if (toolUse) return { type: 'pre', typeLabel: 'ToolUse', agent: agentName, msg: toolUse.name ?? '', time: getTime() }
    const text = content.find(b => b.type === 'text')
    if (text?.text) return { type: 'post', typeLabel: 'Assistant', agent: agentName, msg: (text.text as string).slice(0, 60), time: getTime() }
  }
  if (data.type === 'result') {
    const cost = (data.cost_usd as number) ?? 0
    if (cost) todayCost.value += cost
    return { type: 'stop', typeLabel: 'Result', agent: agentName, msg: ((data.subtype as string) ?? 'done') + (cost ? ` · $${cost.toFixed(4)}` : ''), time: getTime() }
  }
  if (data.type === 'mission_complete') {
    return { type: 'stop', typeLabel: 'Complete', agent: agentName, msg: (data.status as string) ?? 'done', time: getTime() }
  }
  return null
}

onMounted(async () => {
  const d3 = await import('d3')

  // Fetch initial data
  const [agents, missions] = await Promise.all([
    $fetch<{ name: string; model: string }[]>('/api/agents'),
    $fetch<{ agent_name: string; status: string; input: string }[]>('/api/missions'),
  ])

  agentData.value = agents.map(ag => {
    const agMissions = missions.filter(m => m.agent_name === ag.name)
    const running = agMissions.find(m => m.status === 'running')
    return {
      id: ag.name,
      active: !!running,
      missions: agMissions.length,
      model: ag.model,
      av: agentAvatar(ag.name),
      cls: agentClass(ag.name),
      lastAction: running?.input?.slice(0, 50) ?? null,
    }
  })

  // Fetch today cost
  try {
    const stats = await $fetch<{ total?: { cost_usd: number } }>('/api/stats')
    todayCost.value = stats.total?.cost_usd ?? 0
  } catch { /* ignore */ }

  // Subscribe to global SSE
  sseClose = useSSE('/api/events/stream', (data) => {
    const ev = streamEventToConsole(data)
    if (ev) addConsoleEvent(ev)
  })

  // D3 viz
  const svg = d3.select(svgRef.value!)
  const width = window.innerWidth
  const height = window.innerHeight - 52 - 160

  svg.attr('width', width).attr('height', height)

  const defs = svg.append('defs')
  const pattern = defs.append('pattern').attr('id', 'dotgrid').attr('width', 24).attr('height', 24).attr('patternUnits', 'userSpaceOnUse')
  pattern.append('circle').attr('cx', 1.5).attr('cy', 1.5).attr('r', 0.8).attr('fill', 'rgba(255,255,255,0.06)')
  svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#dotgrid)')

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

  const nodes: (AgentNode & { x?: number; y?: number; fx?: number | null; fy?: number | null })[] = agentData.value.map(a => ({ ...a }))
  const links = nodes.filter(n => n.id !== '_main').map(n => ({ source: '_main', target: n.id }))

  simulation = d3.forceSimulation(nodes as any)
    .force('link', d3.forceLink(links).id((d: any) => d.id).distance(160).strength(0.5))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius((d: any) => d.id === '_main' ? 80 : 60))

  const link = svg.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', 'rgba(255,255,255,0.12)').attr('stroke-width', 1).attr('stroke-dasharray', '4,8')

  const activeLink = svg.append('g').selectAll('line')
    .data(links.filter((l: any) => {
      const target = nodes.find(n => n.id === (typeof l.target === 'object' ? (l.target as { id: string }).id : l.target))
      return target?.active
    }))
    .join('line').attr('stroke', 'rgba(224,122,95,0.35)').attr('stroke-width', 1.5)

  const nodeG = svg.append('g').selectAll('g').data(nodes).join('g')
    .style('cursor', 'pointer')
    .call(d3.drag<SVGGElement, any>()
      .on('start', (event, d) => { if (!event.active) (simulation as any).alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
      .on('end', (event, d) => { if (!event.active) (simulation as any).alphaTarget(0); d.fx = null; d.fy = null })
    )

  nodeG.filter((d: any) => d.active).append('circle')
    .attr('class', 'pulse-ring').attr('r', (d: any) => d.id === '_main' ? 80 : 55)
    .attr('fill', 'none').attr('stroke', '#7BD389').attr('stroke-width', 1).attr('opacity', 0.5)
    .style('filter', 'url(#greenGlow)')

  nodeG.append('circle').attr('r', (d: any) => d.id === '_main' ? 68 : 48)
    .attr('fill', 'none')
    .attr('stroke', (d: any) => d.active ? 'rgba(123,211,137,0.2)' : 'rgba(255,255,255,0.04)').attr('stroke-width', 1)

  nodeG.append('circle').attr('r', (d: any) => d.id === '_main' ? 56 : 38)
    .attr('fill', (d: any) => d.id === '_main' ? '#1a130f' : d.active ? '#0f1a0f' : '#141414')
    .attr('stroke', (d: any) => d.id === '_main' ? 'rgba(224,122,95,0.6)' : d.active ? 'rgba(123,211,137,0.5)' : 'rgba(255,255,255,0.1)')
    .attr('stroke-width', (d: any) => d.id === '_main' ? 2 : 1.5)
    .style('filter', (d: any) => d.active ? 'url(#glow)' : 'none')

  nodeG.append('text').text((d: any) => d.id === '_main' ? '_main' : d.id.split('_')[0])
    .attr('text-anchor', 'middle').attr('dy', '0.35em')
    .attr('fill', (d: any) => d.id === '_main' ? '#E07A5F' : d.active ? '#7BD389' : '#8a8a8a')
    .attr('font-family', 'JetBrains Mono, monospace').attr('font-size', (d: any) => d.id === '_main' ? '12px' : '10px')
    .attr('font-weight', '700').style('pointer-events', 'none')

  nodeG.append('text').text((d: any) => d.model.split('-').slice(0, 2).join('-'))
    .attr('text-anchor', 'middle').attr('dy', (d: any) => d.id === '_main' ? '2.2em' : '1.8em')
    .attr('fill', '#5a5a5a').attr('font-family', 'JetBrains Mono, monospace').attr('font-size', '8px')
    .style('pointer-events', 'none')

  nodeG.append('circle').attr('r', 5)
    .attr('cx', (d: any) => d.id === '_main' ? 36 : 24).attr('cy', (d: any) => d.id === '_main' ? -36 : -24)
    .attr('fill', (d: any) => d.active ? '#7BD389' : '#5a5a5a')
    .style('filter', (d: any) => d.active ? 'drop-shadow(0 0 4px rgba(123,211,137,0.5))' : 'none')

  nodeG.on('mouseover', (event, d: any) => {
    tooltip.value = { visible: true, x: event.clientX + 14, y: event.clientY - 10, agent: d }
  }).on('mousemove', (event) => {
    tooltip.value.x = event.clientX + 14; tooltip.value.y = event.clientY - 10
  }).on('mouseout', () => {
    tooltip.value.visible = false
  }).on('click', (event, d: any) => {
    selectedAgent.value = d; tooltip.value.visible = false
  })

  ;(simulation as any).on('tick', () => {
    link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
    activeLink.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
    nodeG.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
  })

  function animatePulse() {
    svg.selectAll('.pulse-ring')
      .transition().duration(2000).ease(d3.easeSinInOut).attr('opacity', 0.2).attr('r', (d: any) => d.id === '_main' ? 90 : 65)
      .transition().duration(2000).ease(d3.easeSinInOut).attr('opacity', 0.5).attr('r', (d: any) => d.id === '_main' ? 80 : 55)
      .on('end', animatePulse)
  }
  animatePulse()

  window.addEventListener('resize', () => {
    const w = window.innerWidth; const h = window.innerHeight - 52 - 160
    svg.attr('width', w).attr('height', h)
    ;(simulation as any).force('center', d3.forceCenter(w / 2, h / 2));
    ;(simulation as any).alpha(0.3).restart()
  })
})

onUnmounted(() => {
  if (sseClose) sseClose()
  if (simulation) (simulation as any).stop()
})
</script>

<style scoped>
.visualizer-root { position: relative; flex: 1; display: flex; flex-direction: column; background: var(--bg); overflow: hidden; }
.viz-svg { flex: 1; display: block; }
.viz-top-bar { position: absolute; top: 14px; left: 0; right: 0; display: flex; align-items: center; padding: 0 22px; gap: 18px; z-index: 10; pointer-events: none; }
.viz-top-bar > * { pointer-events: all; }
.viz-brand { display: flex; align-items: center; gap: 10px; }
.viz-subtitle { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--fg-dim); }
.viz-stats { position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--fg-dim); background: rgba(15,15,15,0.8); border: 1px solid var(--line); border-radius: 20px; padding: 6px 16px; backdrop-filter: blur(8px); }
.viz-stats b { color: var(--fg); }
.viz-stats span { display: flex; align-items: center; }
.viz-actions { display: flex; gap: 8px; margin-left: auto; }
.viz-console { height: 160px; flex-shrink: 0; z-index: 10; }
.viz-tooltip { position: fixed; z-index: 60; background: rgba(20,20,20,0.95); border: 1px solid var(--line-2); border-radius: 8px; padding: 10px 13px; pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,0.5); min-width: 160px; }
.tooltip-name { font-size: 12px; font-weight: 700; color: var(--fg); margin-bottom: 5px; }
.tooltip-model { font-size: 10.5px; color: var(--accent); margin-top: 4px; }
.tooltip-missions { font-size: 10.5px; color: var(--fg-dim); margin-top: 2px; }
.tooltip-action { font-size: 10px; color: var(--fg-dimmer); margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
.agent-panel { position: fixed; top: 52px; right: 0; bottom: 160px; width: 360px; background: var(--bg-1); border-left: 1px solid var(--line-2); z-index: 40; display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.25s ease; box-shadow: -16px 0 48px rgba(0,0,0,0.4); }
.agent-panel.open { transform: translateX(0); }
.agent-panel-header { padding: 14px 16px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.agent-panel-body { flex: 1; overflow-y: auto; padding: 16px; }
</style>
