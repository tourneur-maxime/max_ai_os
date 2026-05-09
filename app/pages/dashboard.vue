<template>
  <div class="page-content">
    <div class="page-header">
      <div class="page-title">Dashboard</div>
      <div class="page-sub">Max OS — 1 · Statistiques réelles</div>
    </div>

    <div class="dashboard-grid">
      <!-- Zone 1: Radar chart -->
      <div class="dash-card" style="grid-area: radar;">
        <div class="dash-card-header">
          <span class="dash-card-title mono">COÛT PAR AGENT</span>
          <span class="badge accent">live</span>
        </div>
        <div class="radar-wrap">
          <svg ref="radarRef" width="340" height="300"></svg>
          <div class="radar-legend">
            <div v-for="d in radarDomains" :key="d.name" class="radar-legend-item">
              <span class="radar-legend-dot" :style="{ background: d.color }"></span>
              <span class="mono" style="font-size:10.5px;">{{ d.name }}</span>
              <span class="mono" style="font-size:10.5px;color:var(--fg-dimmer);margin-left:auto;">${{ d.cost }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Zone 2: Stats -->
      <div class="dash-card" style="grid-area: stats;">
        <div class="dash-card-header">
          <span class="dash-card-title mono">OVERVIEW</span>
        </div>
        <div class="stats-grid">
          <div class="big-stat-card featured">
            <div class="big-stat-label">Total dépensé</div>
            <div class="big-stat-value">${{ (stats.total?.cost_usd ?? 0).toFixed(4) }}</div>
          </div>
          <div class="big-stat-card">
            <div class="big-stat-label">Missions</div>
            <div class="big-stat-value">{{ stats.total?.missions ?? 0 }}</div>
          </div>
          <div class="big-stat-card">
            <div class="big-stat-label">Tokens input</div>
            <div class="big-stat-value">{{ formatTokens(stats.total?.tokens_in ?? 0) }}</div>
          </div>
          <div class="big-stat-card">
            <div class="big-stat-label">Tokens output</div>
            <div class="big-stat-value">{{ formatTokens(stats.total?.tokens_out ?? 0) }}</div>
          </div>
          <div class="big-stat-card">
            <div class="big-stat-label">Coût moyen / mission</div>
            <div class="big-stat-value">
              {{ stats.total?.missions ? '$' + ((stats.total.cost_usd ?? 0) / stats.total.missions).toFixed(4) : '—' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Zone 3: Bar chart tokens -->
      <div class="dash-card" style="grid-area: tokens;">
        <div class="dash-card-header">
          <span class="dash-card-title mono">TOKENS / JOUR</span>
          <div style="display:flex;gap:10px;">
            <span class="legend-dot" style="background:var(--info)"></span><span style="font-size:10.5px;color:var(--fg-dim)">Input</span>
            <span class="legend-dot" style="background:var(--accent)"></span><span style="font-size:10.5px;color:var(--fg-dim)">Output</span>
          </div>
        </div>
        <svg ref="barRef" class="bar-chart-svg"></svg>
        <div v-if="!stats.daily?.length" style="text-align:center;color:var(--fg-dimmer);font-size:12px;padding:20px;">
          Pas encore de données.
        </div>
      </div>

      <!-- Zone 4: Agent breakdown -->
      <div class="dash-card" style="grid-area: agents;">
        <div class="dash-card-header">
          <span class="dash-card-title mono">AGENT BREAKDOWN</span>
        </div>
        <div class="agent-breakdown-list">
          <div v-for="ag in agentBreakdown" :key="ag.name" class="agent-breakdown-item">
            <div :class="['av', agentClass(ag.name)]">{{ agentAvatar(ag.name) }}</div>
            <div class="agent-breakdown-info">
              <div class="agent-breakdown-name mono">{{ ag.name }}</div>
              <div class="progress-bar" style="margin-top:4px;">
                <div class="fill" :style="{ width: ag.pct + '%', background: agentColor(ag.name) }"></div>
              </div>
            </div>
            <div class="agent-breakdown-stats">
              <span class="mono" style="font-size:11px;color:var(--accent)">${{ ag.cost_usd.toFixed(4) }}</span>
              <span class="mono" style="font-size:10px;color:var(--fg-dimmer)">{{ ag.missions }}m</span>
            </div>
          </div>
          <div v-if="!agentBreakdown.length" style="color:var(--fg-dimmer);font-size:12px;">
            Aucun agent actif.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

definePageMeta({ layout: 'default' })

const { $fetch } = useApi()

interface Stats {
  total?: { missions: number; cost_usd: number; tokens_in: number; tokens_out: number }
  by_agent?: { name: string; missions: number; cost_usd: number; tokens_in: number; tokens_out: number }[]
  daily?: { date: string; missions: number; cost_usd: number; tokens_in: number; tokens_out: number }[]
}

const stats = ref<Stats>({})
const radarRef = ref<SVGSVGElement | null>(null)
const barRef = ref<SVGSVGElement | null>(null)

const AGENT_COLORS = ['#E07A5F', '#7BD389', '#6FA8FF', '#B98CFF', '#E0C25F', '#8a8a8a', '#5a5a5a']

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

function agentColor(name: string): string {
  const agents = stats.value.by_agent ?? []
  const idx = agents.findIndex(a => a.name === name)
  return AGENT_COLORS[idx % AGENT_COLORS.length] ?? '#E07A5F'
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

const agentBreakdown = computed(() => {
  const agents = stats.value.by_agent ?? []
  const totalCost = agents.reduce((acc, a) => acc + (a.cost_usd ?? 0), 0) || 1
  return agents.map((a, i) => ({
    ...a,
    pct: Math.round((a.cost_usd ?? 0) / totalCost * 100),
    color: AGENT_COLORS[i % AGENT_COLORS.length],
  }))
})

const radarDomains = computed(() => {
  return agentBreakdown.value.slice(0, 6).map((a, i) => ({
    name: a.name.toUpperCase(),
    cost: (a.cost_usd ?? 0).toFixed(4),
    pct: a.pct / 100,
    color: AGENT_COLORS[i % AGENT_COLORS.length],
  }))
})

async function drawCharts() {
  const d3 = await import('d3')

  // ---- RADAR CHART ----
  if (radarRef.value && radarDomains.value.length > 0) {
    const svgEl = radarRef.value
    d3.select(svgEl).selectAll('*').remove()
    const cx = 170, cy = 155, r = 110
    const domains = radarDomains.value
    const n = domains.length
    const angles = domains.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2)
    const svg = d3.select(svgEl)

    for (let ring = 1; ring <= 4; ring++) {
      const pts = angles.map(a => [cx + (r * ring / 4) * Math.cos(a), cy + (r * ring / 4) * Math.sin(a)])
      pts.push(pts[0])
      svg.append('polygon')
        .attr('points', (pts as [number,number][]).map(p => p.join(',')).join(' '))
        .attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.06)').attr('stroke-width', 1)
    }

    angles.forEach((a, i) => {
      svg.append('line').attr('x1', cx).attr('y1', cy)
        .attr('x2', cx + r * Math.cos(a)).attr('y2', cy + r * Math.sin(a))
        .attr('stroke', 'rgba(255,255,255,0.08)').attr('stroke-width', 1)
      const lr = r + 22
      svg.append('text')
        .attr('x', cx + lr * Math.cos(a)).attr('y', cy + lr * Math.sin(a))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', domains[i].color).attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', '9px').attr('font-weight', '700').attr('letter-spacing', '0.08em')
        .text(domains[i].name.slice(0, 10))
    })

    const pts = angles.map((a, i) => [cx + r * Math.max(domains[i].pct, 0.05) * Math.cos(a), cy + r * Math.max(domains[i].pct, 0.05) * Math.sin(a)]) as [number,number][]
    pts.push(pts[0])
    svg.append('polygon')
      .attr('points', pts.map(p => p.join(',')).join(' '))
      .attr('fill', 'rgba(224,122,95,0.15)').attr('stroke', '#E07A5F').attr('stroke-width', 1.5)
    angles.forEach((a, i) => {
      svg.append('circle')
        .attr('cx', cx + r * Math.max(domains[i].pct, 0.05) * Math.cos(a))
        .attr('cy', cy + r * Math.max(domains[i].pct, 0.05) * Math.sin(a))
        .attr('r', 4).attr('fill', domains[i].color).attr('stroke', '#111111').attr('stroke-width', 2)
    })
  }

  // ---- BAR CHART ----
  const daily = stats.value.daily ?? []
  if (barRef.value && daily.length > 0) {
    const barEl = barRef.value
    d3.select(barEl).selectAll('*').remove()
    const bW = barEl.clientWidth || 460
    const bH = 160
    d3.select(barEl).attr('width', bW).attr('height', bH)
    const margin = { top: 10, right: 10, bottom: 24, left: 42 }
    const innerW = bW - margin.left - margin.right
    const innerH = bH - margin.top - margin.bottom
    const g = d3.select(barEl).append('g').attr('transform', `translate(${margin.left},${margin.top})`)
    const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
    const x = d3.scaleBand().domain(sorted.map(d => d.date)).range([0, innerW]).padding(0.15)
    const maxVal = d3.max(sorted, d => d.tokens_in + d.tokens_out) || 1
    const y = d3.scaleLinear().domain([0, maxVal]).range([innerH, 0])

    y.ticks(4).forEach(tick => {
      g.append('line').attr('x1', 0).attr('y1', y(tick)).attr('x2', innerW).attr('y2', y(tick))
        .attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-width', 1)
      g.append('text').attr('x', -6).attr('y', y(tick)).attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle').attr('fill', 'var(--fg-dimmer)')
        .attr('font-size', '9px').attr('font-family', 'JetBrains Mono, monospace')
        .text(tick >= 1000 ? (tick / 1000).toFixed(0) + 'k' : tick)
    })

    g.selectAll('.bar-input').data(sorted).join('rect')
      .attr('x', d => x(d.date)!).attr('y', d => y(d.tokens_in))
      .attr('width', x.bandwidth()).attr('height', d => innerH - y(d.tokens_in))
      .attr('fill', 'rgba(111,168,255,0.6)').attr('rx', 1)

    g.selectAll('.bar-output').data(sorted).join('rect')
      .attr('x', d => x(d.date)!).attr('y', d => y(d.tokens_in + d.tokens_out))
      .attr('width', x.bandwidth()).attr('height', d => innerH - y(d.tokens_out))
      .attr('fill', 'rgba(224,122,95,0.7)').attr('rx', 1)
  }
}

onMounted(async () => {
  stats.value = await $fetch<Stats>('/api/stats')
  await drawCharts()
})

watch(stats, drawCharts, { deep: true })
</script>

<style scoped>
.page-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.page-header { display: flex; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--line); flex-shrink: 0; gap: 12px; }
.dashboard-grid {
  flex: 1; overflow-y: auto; padding: 18px 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  grid-template-areas: "radar stats" "tokens agents";
  gap: 14px;
}
.dash-card { background: var(--bg-1); border: 1px solid var(--line); border-radius: 11px; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.dash-card-header { display: flex; align-items: center; justify-content: space-between; }
.dash-card-title { font-size: 10.5px; font-weight: 700; letter-spacing: 0.1em; color: var(--fg-dim); }
.radar-wrap { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.radar-legend { display: flex; flex-direction: column; gap: 7px; min-width: 120px; }
.radar-legend-item { display: flex; align-items: center; gap: 7px; }
.radar-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.stats-grid { display: flex; flex-direction: column; gap: 8px; }
.big-stat-card { padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 8px; display: flex; align-items: center; gap: 12px; }
.big-stat-card.featured { background: var(--accent-softer); border-color: rgba(224,122,95,0.25); }
.big-stat-label { font-size: 11px; color: var(--fg-dim); flex: 1; }
.big-stat-value { font-size: 16px; font-weight: 700; color: var(--fg); font-family: 'JetBrains Mono', monospace; }
.big-stat-card.featured .big-stat-value { color: var(--accent); }
.big-stat-trend { font-size: 10.5px; color: var(--fg-dimmer); font-family: 'JetBrains Mono', monospace; }
.bar-chart-svg { width: 100%; display: block; }
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; }
.agent-breakdown-list { display: flex; flex-direction: column; gap: 10px; }
.agent-breakdown-item { display: flex; align-items: center; gap: 10px; }
.agent-breakdown-info { flex: 1; min-width: 0; }
.agent-breakdown-name { font-size: 11.5px; color: var(--fg-dim); margin-bottom: 2px; }
.agent-breakdown-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; flex-shrink: 0; min-width: 56px; }
</style>
