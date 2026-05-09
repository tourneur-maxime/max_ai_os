<template>
  <div class="page-content">
    <div class="page-header">
      <div class="page-title">Dashboard</div>
      <div class="page-sub">Max OS — 1 · May 2026</div>
      <div style="margin-left:auto;display:flex;gap:8px;">
        <select class="select" style="width:auto;font-size:11px;padding:4px 28px 4px 8px;">
          <option>Last 30 days</option>
          <option>This week</option>
          <option>Last 7 days</option>
        </select>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Zone 1: Radar chart -->
      <div class="dash-card" style="grid-area: radar;">
        <div class="dash-card-header">
          <span class="dash-card-title mono">COST BY DOMAIN</span>
          <span class="badge accent">30d</span>
        </div>
        <div class="radar-wrap">
          <svg ref="radarRef" width="340" height="300"></svg>
          <div class="radar-legend">
            <div v-for="d in domains" :key="d.name" class="radar-legend-item">
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
            <div class="big-stat-label">Total spent</div>
            <div class="big-stat-value">$24.18</div>
            <div class="big-stat-trend up">↑ 12% vs last month</div>
          </div>
          <div class="big-stat-card">
            <div class="big-stat-label">Missions</div>
            <div class="big-stat-value">218</div>
            <div class="big-stat-trend up">↑ 34 vs last month</div>
          </div>
          <div class="big-stat-card">
            <div class="big-stat-label">Tokens</div>
            <div class="big-stat-value">4.7M</div>
            <div class="big-stat-trend up">↑ 18%</div>
          </div>
          <div class="big-stat-card">
            <div class="big-stat-label">Avg cost/mission</div>
            <div class="big-stat-value">$0.11</div>
            <div class="big-stat-trend down">↓ $0.02</div>
          </div>
          <div class="big-stat-card">
            <div class="big-stat-label">Active agents</div>
            <div class="big-stat-value">3</div>
            <div class="big-stat-trend neutral">of 7 configured</div>
          </div>
        </div>
      </div>

      <!-- Zone 3: Bar chart tokens -->
      <div class="dash-card" style="grid-area: tokens;">
        <div class="dash-card-header">
          <span class="dash-card-title mono">TOKENS / DAY</span>
          <div style="display:flex;gap:10px;">
            <span class="legend-dot" style="background:var(--info)"></span><span style="font-size:10.5px;color:var(--fg-dim)">Input</span>
            <span class="legend-dot" style="background:var(--accent)"></span><span style="font-size:10.5px;color:var(--fg-dim)">Output</span>
          </div>
        </div>
        <svg ref="barRef" class="bar-chart-svg"></svg>
      </div>

      <!-- Zone 4: Agent breakdown -->
      <div class="dash-card" style="grid-area: agents;">
        <div class="dash-card-header">
          <span class="dash-card-title mono">AGENT BREAKDOWN</span>
        </div>
        <div class="agent-breakdown-list">
          <div v-for="ag in agentBreakdown" :key="ag.name" class="agent-breakdown-item">
            <div :class="['av', ag.cls]">{{ ag.av }}</div>
            <div class="agent-breakdown-info">
              <div class="agent-breakdown-name mono">{{ ag.name }}</div>
              <div class="progress-bar" style="margin-top:4px;">
                <div class="fill" :style="{ width: ag.pct + '%', background: ag.color }"></div>
              </div>
            </div>
            <div class="agent-breakdown-stats">
              <span class="mono" style="font-size:11px;color:var(--accent)">{{ ag.cost }}</span>
              <span class="mono" style="font-size:10px;color:var(--fg-dimmer)">{{ ag.missions }}m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'default' })

const radarRef = ref<SVGSVGElement | null>(null)
const barRef = ref<SVGSVGElement | null>(null)

const domains = [
  { name: 'DEV', cost: '12.40', pct: 0.51, color: '#6FA8FF' },
  { name: 'CONTENT', cost: '3.84', pct: 0.16, color: '#B98CFF' },
  { name: 'PRODUCT', cost: '2.96', pct: 0.12, color: '#E07A5F' },
  { name: 'OPS', cost: '1.82', pct: 0.075, color: '#E0C25F' },
  { name: 'LIFE', cost: '1.46', pct: 0.06, color: '#7BD389' },
  { name: 'RESEARCH', cost: '1.70', pct: 0.07, color: '#6FA8FF' },
]

const agentBreakdown = [
  { name: '_main', av: '_M', cls: 'salmon', cost: '$8.42', missions: 142, pct: 34.8, color: '#E07A5F' },
  { name: 'coder_07', av: 'C', cls: 'green', cost: '$7.18', missions: 67, pct: 29.7, color: '#7BD389' },
  { name: 'researcher_42', av: 'R', cls: 'blue', cost: '$5.24', missions: 38, pct: 21.7, color: '#6FA8FF' },
  { name: 'memory_03', av: 'M', cls: 'purple', cost: '$1.84', missions: 191, pct: 7.6, color: '#B98CFF' },
  { name: 'reviewer_19', av: 'Rv', cls: '', cost: '$0.94', missions: 24, pct: 3.9, color: '#E0C25F' },
  { name: 'planner_04', av: 'Pl', cls: '', cost: '$0.42', missions: 9, pct: 1.7, color: '#8a8a8a' },
  { name: 'shell_01', av: 'Sh', cls: '', cost: '$0.14', missions: 14, pct: 0.6, color: '#5a5a5a' },
]

// Generate 30 days of token data
function genTokenData() {
  return Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    input: Math.round(80000 + Math.random() * 200000),
    output: Math.round(20000 + Math.random() * 60000),
  }))
}

const tokenData = genTokenData()

onMounted(async () => {
  const d3 = await import('d3')

  // ---- RADAR CHART ----
  const radarEl = radarRef.value!
  const rW = 340, rH = 300
  const cx = 170, cy = 155, r = 110

  const svg = d3.select(radarEl)
  const n = domains.length
  const angles = domains.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2)

  // Rings
  for (let ring = 1; ring <= 4; ring++) {
    const pts = angles.map(a => [cx + (r * ring / 4) * Math.cos(a), cy + (r * ring / 4) * Math.sin(a)])
    pts.push(pts[0])
    svg.append('polygon')
      .attr('points', (pts as [number, number][]).map(p => p.join(',')).join(' '))
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.06)')
      .attr('stroke-width', 1)
  }

  // Axes
  angles.forEach((a, i) => {
    svg.append('line')
      .attr('x1', cx).attr('y1', cy)
      .attr('x2', cx + r * Math.cos(a))
      .attr('y2', cy + r * Math.sin(a))
      .attr('stroke', 'rgba(255,255,255,0.08)')
      .attr('stroke-width', 1)

    // Labels
    const labelR = r + 22
    svg.append('text')
      .attr('x', cx + labelR * Math.cos(a))
      .attr('y', cy + labelR * Math.sin(a))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', domains[i].color)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '9px')
      .attr('font-weight', '700')
      .attr('letter-spacing', '0.08em')
      .text(domains[i].name)
  })

  // Data polygon
  const dataPoints = angles.map((a, i) => [
    cx + r * domains[i].pct * Math.cos(a),
    cy + r * domains[i].pct * Math.sin(a)
  ]) as [number, number][]
  dataPoints.push(dataPoints[0])

  svg.append('polygon')
    .attr('points', dataPoints.map(p => p.join(',')).join(' '))
    .attr('fill', 'rgba(224,122,95,0.15)')
    .attr('stroke', '#E07A5F')
    .attr('stroke-width', 1.5)

  // Dots
  angles.forEach((a, i) => {
    svg.append('circle')
      .attr('cx', cx + r * domains[i].pct * Math.cos(a))
      .attr('cy', cy + r * domains[i].pct * Math.sin(a))
      .attr('r', 4)
      .attr('fill', domains[i].color)
      .attr('stroke', '#111111')
      .attr('stroke-width', 2)
  })

  // ---- BAR CHART ----
  const barEl = barRef.value!
  const bW = barEl.clientWidth || 460
  const bH = 160

  const bSvg = d3.select(barEl).attr('width', bW).attr('height', bH)

  const margin = { top: 10, right: 10, bottom: 24, left: 42 }
  const innerW = bW - margin.left - margin.right
  const innerH = bH - margin.top - margin.bottom

  const g = bSvg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  const x = d3.scaleBand().domain(tokenData.map(d => String(d.day))).range([0, innerW]).padding(0.15)
  const maxVal = d3.max(tokenData, d => d.input + d.output) || 1
  const y = d3.scaleLinear().domain([0, maxVal]).range([innerH, 0])

  // Grid lines
  y.ticks(4).forEach(tick => {
    g.append('line')
      .attr('x1', 0).attr('y1', y(tick))
      .attr('x2', innerW).attr('y2', y(tick))
      .attr('stroke', 'rgba(255,255,255,0.05)')
      .attr('stroke-width', 1)
  })

  // Y axis labels
  y.ticks(4).forEach(tick => {
    g.append('text')
      .attr('x', -6).attr('y', y(tick))
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'var(--fg-dimmer)')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(tick >= 1000 ? (tick / 1000).toFixed(0) + 'k' : tick)
  })

  // Input bars (bottom)
  g.selectAll('.bar-input')
    .data(tokenData)
    .join('rect')
    .attr('class', 'bar-input')
    .attr('x', d => x(String(d.day))!)
    .attr('y', d => y(d.input))
    .attr('width', x.bandwidth())
    .attr('height', d => innerH - y(d.input))
    .attr('fill', 'rgba(111,168,255,0.6)')
    .attr('rx', 1)

  // Output bars (stacked)
  g.selectAll('.bar-output')
    .data(tokenData)
    .join('rect')
    .attr('class', 'bar-output')
    .attr('x', d => x(String(d.day))!)
    .attr('y', d => y(d.input + d.output))
    .attr('width', x.bandwidth())
    .attr('height', d => innerH - y(d.output))
    .attr('fill', 'rgba(224,122,95,0.7)')
    .attr('rx', 1)

  // X axis labels (every 5 days)
  tokenData.filter((_, i) => i % 5 === 0).forEach(d => {
    g.append('text')
      .attr('x', x(String(d.day))! + x.bandwidth() / 2)
      .attr('y', innerH + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--fg-dimmer)')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(d.day)
  })
})
</script>

<style scoped>
.page-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.page-header {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  gap: 12px;
}
.dashboard-grid {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  grid-template-areas:
    "radar stats"
    "tokens agents";
  gap: 14px;
}
.dash-card {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dash-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dash-card-title {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--fg-dim);
}

/* Radar */
.radar-wrap {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.radar-legend {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 120px;
}
.radar-legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
}
.radar-legend-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}

/* Stats grid */
.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.big-stat-card {
  padding: 10px 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--line);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.big-stat-card.featured {
  background: var(--accent-softer);
  border-color: rgba(224,122,95,0.25);
}
.big-stat-label {
  font-size: 11px;
  color: var(--fg-dim);
  flex: 1;
}
.big-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--fg);
  font-family: 'JetBrains Mono', monospace;
}
.big-stat-card.featured .big-stat-value { color: var(--accent); }
.big-stat-trend {
  font-size: 10.5px;
  color: var(--fg-dimmer);
  font-family: 'JetBrains Mono', monospace;
}
.big-stat-trend.up { color: var(--good); }
.big-stat-trend.down { color: var(--bad); }

/* Bar chart */
.bar-chart-svg { width: 100%; display: block; }

.legend-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 2px;
}

/* Agent breakdown */
.agent-breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.agent-breakdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.agent-breakdown-info {
  flex: 1;
  min-width: 0;
}
.agent-breakdown-name {
  font-size: 11.5px;
  color: var(--fg-dim);
  margin-bottom: 2px;
}
.agent-breakdown-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
  min-width: 56px;
}
</style>
