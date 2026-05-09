<template>
  <div class="page-content">
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title mono" style="font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.1em;font-size:13px;">SKILLS CATALOG</div>
        <div class="page-sub">{{ skills.length }} skills · {{ skills.filter(s => s.active).length }} actifs</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="skills-filters">
      <input v-model="searchQ" type="text" class="input" style="width:220px;" placeholder="Search skills…" />
      <div class="segmented">
        <button v-for="c in categories" :key="c" :class="['seg-btn', { active: activeCategory === c }]" @click="activeCategory = c">{{ c }}</button>
      </div>
      <div class="segmented">
        <button v-for="s in sources" :key="s" :class="['seg-btn', { active: activeSource === s }]" @click="activeSource = s">{{ s }}</button>
      </div>
    </div>

    <!-- Grid -->
    <div class="skills-grid">
      <div
        v-for="skill in filteredSkills"
        :key="skill.name"
        :class="['skill-card', { active: skill.active }]"
        @click="openModal(skill)"
      >
        <div class="skill-card-header">
          <div :class="['domain-tag', skill.cat.toLowerCase()]">{{ skill.cat }}</div>
          <label class="toggle" @click.stop>
            <input type="checkbox" v-model="skill.active" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="skill-name mono">{{ skill.name }}</div>
        <div class="skill-desc">{{ skill.desc }}</div>
        <div class="skill-card-footer">
          <span :class="['domain-tag', skill.cat.toLowerCase()]">{{ skill.cat }}</span>
          <span class="skill-source-tag">{{ skill.source }}</span>
          <div class="skill-avatars">
            <span v-for="ag in skill.agents.slice(0,3)" :key="ag" :class="['av', ag.cls]" style="width:16px;height:16px;font-size:7px;">{{ ag.av }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Skill Modal -->
    <div v-if="modalSkill" class="modal-overlay" @click.self="modalSkill = null">
      <div class="modal" style="width:620px;">
        <div class="modal-header">
          <span :class="['domain-tag', modalSkill.cat.toLowerCase()]">{{ modalSkill.cat }}</span>
          <div style="flex:1;">
            <div class="mono" style="font-size:14px;font-weight:700;color:var(--fg)">{{ modalSkill.name }}</div>
            <div style="font-size:11.5px;color:var(--fg-dim);margin-top:2px;">{{ modalSkill.desc }}</div>
          </div>
          <button class="modal-close" @click="modalSkill = null">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:12.5px;color:var(--fg-dim);line-height:1.6;margin-bottom:16px;">{{ modalSkill.longDesc }}</p>

          <div class="section-title">Skill Definition (YAML)</div>
          <div class="code-block" style="font-size:11px;">{{ modalSkill.yaml }}</div>

          <div class="section-title" style="margin-top:20px;">Activate per agent</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div v-for="ag in agentList" :key="ag.name" class="channel-item" style="padding:8px 10px;">
              <span :class="['av', ag.cls]">{{ ag.av }}</span>
              <span class="mono" style="font-size:12px;flex:1;">{{ ag.name }}</span>
              <label class="toggle">
                <input type="checkbox" :checked="modalSkill.agents.some((a: any) => a.name === ag.name)" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="section-title" style="margin-top:20px;">Usage · 30 days</div>
          <div class="usage-chart">
            <div v-for="(d, i) in modalSkill.usageData" :key="i" class="usage-bar-wrap">
              <div class="usage-bar" :style="{ height: (d / Math.max(...modalSkill.usageData) * 60) + 'px' }"></div>
            </div>
          </div>
          <div style="font-size:10.5px;color:var(--fg-dimmer);margin-top:4px;font-family:'JetBrains Mono',monospace;">
            {{ modalSkill.usageData.reduce((a: number, b: number) => a + b, 0) }} invocations this month
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

definePageMeta({ layout: 'default' })

const searchQ = ref('')
const activeCategory = ref('All')
const activeSource = ref('All')
const modalSkill = ref<any>(null)

const categories = ['All', 'Dev', 'Content', 'Ops', 'Life', 'Research']
const sources = ['All', 'Built-in', 'Custom']

const agentList = [
  { name: '_main', av: '_M', cls: 'salmon' },
  { name: 'coder_07', av: 'C', cls: 'green' },
  { name: 'researcher_42', av: 'R', cls: 'blue' },
  { name: 'reviewer_19', av: 'Rv', cls: '' },
  { name: 'memory_03', av: 'M', cls: 'purple' },
  { name: 'shell_01', av: 'Sh', cls: '' },
  { name: 'planner_04', av: 'Pl', cls: '' },
]

const skills = reactive([
  {
    name: 'code_review', cat: 'Dev', source: 'Built-in', active: true,
    desc: 'Automated code review with style & logic checks',
    longDesc: 'Performs comprehensive code review including style, logic errors, security vulnerabilities, and performance issues. Generates detailed reports with actionable suggestions.',
    agents: [{ name: 'reviewer_19', av: 'Rv', cls: '' }, { name: 'coder_07', av: 'C', cls: 'green' }],
    yaml: `name: code_review\nversion: 1.2.0\ntrigger: on_demand\ntools: [read_file, web_search]\nmodel: claude-sonnet-4.5\nprompt: |\n  Review the provided code for:\n  - Logic errors and bugs\n  - Security vulnerabilities\n  - Performance issues\n  - Style consistency`,
    usageData: [4,7,3,8,12,5,6,9,11,4,7,8,6,10,12,8,5,7,9,11,6,8,4,7,12,9,6,8,10,7]
  },
  {
    name: 'web_research', cat: 'Research', source: 'Built-in', active: true,
    desc: 'Deep web research with source verification',
    longDesc: 'Conducts thorough web research on any topic, verifying sources and synthesizing information into structured reports.',
    agents: [{ name: 'researcher_42', av: 'R', cls: 'blue' }],
    yaml: `name: web_research\nversion: 2.0.1\ntrigger: on_demand\ntools: [web_search, web_fetch]\nmodel: gpt-5\nmax_duration: 15m`,
    usageData: [12,8,15,9,18,11,7,14,16,8,12,10,9,13,17,11,8,12,14,16,9,11,7,10,15,12,9,11,13,10]
  },
  {
    name: 'write_blog', cat: 'Content', source: 'Built-in', active: true,
    desc: 'Write long-form blog posts from outlines',
    longDesc: 'Generates high-quality long-form blog posts from a brief outline or topic. Includes research, structuring, and SEO optimization.',
    agents: [{ name: '_main', av: '_M', cls: 'salmon' }, { name: 'researcher_42', av: 'R', cls: 'blue' }],
    yaml: `name: write_blog\nversion: 1.0.3\ntrigger: on_demand\ntools: [web_search, write_file]\nmodel: claude-opus-4\ntarget_words: 1500-2000`,
    usageData: [2,1,3,2,4,1,2,3,2,1,3,4,2,1,3,2,3,4,2,1,3,2,4,3,2,1,3,4,2,3]
  },
  {
    name: 'git_commit', cat: 'Dev', source: 'Built-in', active: true,
    desc: 'Smart commit messages from diffs',
    longDesc: 'Analyzes git diffs and generates conventional commit messages following project conventions. Supports conventional commits format.',
    agents: [{ name: 'coder_07', av: 'C', cls: 'green' }],
    yaml: `name: git_commit\nversion: 1.1.0\ntrigger: on_demand\ntools: [run_command, read_file]\nmodel: gpt-5-mini\nformat: conventional`,
    usageData: [8,12,6,10,14,8,9,11,13,7,10,12,8,11,15,9,7,10,12,14,8,10,6,9,13,10,8,11,13,9]
  },
  {
    name: 'deploy_check', cat: 'Ops', source: 'Built-in', active: true,
    desc: 'Pre-deployment health check pipeline',
    longDesc: 'Runs a comprehensive pre-deployment checklist: tests, linting, security scan, dependency audit, and environment validation.',
    agents: [{ name: 'shell_01', av: 'Sh', cls: '' }, { name: 'coder_07', av: 'C', cls: 'green' }],
    yaml: `name: deploy_check\nversion: 1.3.2\ntrigger: pre_deploy\ntools: [run_command]\nmodel: gpt-5-mini\nfail_fast: true`,
    usageData: [1,2,1,3,2,1,2,1,3,2,1,2,1,3,2,1,2,3,1,2,1,3,2,1,2,1,3,2,1,2]
  },
  {
    name: 'daily_brief', cat: 'Life', source: 'Custom', active: true,
    desc: 'Morning briefing with tasks & news',
    longDesc: 'Generates a personalized morning briefing combining calendar events, pending tasks, relevant news, and agent status updates.',
    agents: [{ name: '_main', av: '_M', cls: 'salmon' }],
    yaml: `name: daily_brief\nversion: 0.9.1\ntrigger: cron(0 8 * * *)\ntools: [web_search, query_memory, read_file]\nmodel: gpt-5-mini\ndelivery: telegram`,
    usageData: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  },
  {
    name: 'test_gen', cat: 'Dev', source: 'Built-in', active: false,
    desc: 'Generate unit tests from source files',
    longDesc: 'Analyzes source code and generates comprehensive unit tests with edge cases. Supports Jest, Vitest, Pytest, and Go test.',
    agents: [{ name: 'coder_07', av: 'C', cls: 'green' }],
    yaml: `name: test_gen\nversion: 1.0.0\ntrigger: on_demand\ntools: [read_file, write_file]\nmodel: claude-sonnet-4.5\nframework: vitest`,
    usageData: [0,2,1,3,0,2,1,0,3,1,2,0,1,3,2,1,0,2,1,3,0,1,2,1,3,0,2,1,0,2]
  },
  {
    name: 'doc_gen', cat: 'Dev', source: 'Built-in', active: false,
    desc: 'Generate JSDoc/TSDoc from code',
    longDesc: 'Automatically generates comprehensive documentation from TypeScript/JavaScript code, including JSDoc comments, README sections, and API docs.',
    agents: [{ name: 'coder_07', av: 'C', cls: 'green' }, { name: 'reviewer_19', av: 'Rv', cls: '' }],
    yaml: `name: doc_gen\nversion: 1.1.0\ntrigger: on_demand\ntools: [read_file, write_file]\nmodel: claude-sonnet-4.5\nformat: tsdoc`,
    usageData: [0,1,2,0,1,0,2,1,0,2,1,0,2,1,0,1,2,0,1,2,0,1,0,2,1,0,1,2,0,1]
  },
  {
    name: 'email_draft', cat: 'Content', source: 'Custom', active: true,
    desc: 'Draft professional emails from bullet points',
    longDesc: 'Converts bullet point notes into polished professional emails. Adapts tone based on recipient and context.',
    agents: [{ name: '_main', av: '_M', cls: 'salmon' }],
    yaml: `name: email_draft\nversion: 0.8.0\ntrigger: on_demand\ntools: []\nmodel: gpt-5-mini\ntone: professional`,
    usageData: [3,2,4,1,3,2,4,3,2,1,3,4,2,3,1,4,2,3,4,2,1,3,2,4,3,1,2,4,3,2]
  },
  {
    name: 'sprint_plan', cat: 'Ops', source: 'Custom', active: true,
    desc: 'Weekly sprint planning from backlog',
    longDesc: 'Analyzes the project backlog, estimates task complexity, and generates an optimized sprint plan with agent assignments.',
    agents: [{ name: 'planner_04', av: 'Pl', cls: '' }, { name: '_main', av: '_M', cls: 'salmon' }],
    yaml: `name: sprint_plan\nversion: 1.0.0\ntrigger: cron(0 9 * * MON)\ntools: [read_file, write_file]\nmodel: claude-opus-4\ncapacity: auto`,
    usageData: [0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0]
  },
  {
    name: 'security_scan', cat: 'Dev', source: 'Built-in', active: false,
    desc: 'Scan codebase for security vulnerabilities',
    longDesc: 'Performs static analysis for common security vulnerabilities: SQL injection, XSS, CSRF, insecure dependencies, and credential leaks.',
    agents: [{ name: 'reviewer_19', av: 'Rv', cls: '' }],
    yaml: `name: security_scan\nversion: 2.1.0\ntrigger: on_demand\ntools: [read_file, run_command]\nmodel: gpt-5\nseverity_threshold: medium`,
    usageData: [0,0,1,0,0,1,0,0,2,0,1,0,0,1,0,0,1,0,0,2,0,0,1,0,1,0,0,1,0,0]
  },
  {
    name: 'meeting_notes', cat: 'Life', source: 'Custom', active: true,
    desc: 'Structure meeting notes into action items',
    longDesc: 'Converts raw meeting notes into structured summaries with decisions, action items, owners, and due dates.',
    agents: [{ name: '_main', av: '_M', cls: 'salmon' }],
    yaml: `name: meeting_notes\nversion: 1.0.0\ntrigger: on_demand\ntools: [write_file]\nmodel: gpt-5-mini\noutput: markdown`,
    usageData: [2,1,3,2,4,1,2,3,2,1,3,2,1,4,2,1,3,2,4,1,2,3,1,2,4,2,1,3,2,1]
  },
  {
    name: 'db_migrate', cat: 'Ops', source: 'Custom', active: false,
    desc: 'Generate database migration scripts',
    longDesc: 'Analyzes schema changes and generates safe, reversible database migration scripts for PostgreSQL, MySQL, and SQLite.',
    agents: [{ name: 'coder_07', av: 'C', cls: 'green' }, { name: 'shell_01', av: 'Sh', cls: '' }],
    yaml: `name: db_migrate\nversion: 0.7.2\ntrigger: on_demand\ntools: [read_file, run_command, write_file]\nmodel: gpt-5\ndb: postgresql`,
    usageData: [0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0]
  },
  {
    name: 'translate', cat: 'Content', source: 'Built-in', active: false,
    desc: 'Professional translation with context awareness',
    longDesc: 'Translates content while preserving technical accuracy, tone, and cultural nuances. Supports 30+ languages.',
    agents: [{ name: '_main', av: '_M', cls: 'salmon' }],
    yaml: `name: translate\nversion: 1.5.0\ntrigger: on_demand\ntools: []\nmodel: gpt-5-mini\npreserve_formatting: true`,
    usageData: [1,0,2,1,0,2,1,0,1,2,0,1,2,0,1,0,2,1,0,2,1,0,1,2,0,1,0,2,1,0]
  },
  {
    name: 'habit_track', cat: 'Life', source: 'Custom', active: true,
    desc: 'Daily habit tracking and nudges',
    longDesc: 'Tracks configured habits, sends reminders via Telegram, and generates weekly progress reports with streak analysis.',
    agents: [{ name: '_main', av: '_M', cls: 'salmon' }],
    yaml: `name: habit_track\nversion: 1.0.0\ntrigger: cron(0 7,20 * * *)\ntools: [query_memory, write_memory]\nmodel: gpt-5-mini\ndelivery: telegram`,
    usageData: [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]
  },
  {
    name: 'perf_profile', cat: 'Dev', source: 'Custom', active: false,
    desc: 'Profile and optimize code performance',
    longDesc: 'Analyzes performance bottlenecks in code, identifies slow functions, and suggests optimizations with benchmarks.',
    agents: [{ name: 'coder_07', av: 'C', cls: 'green' }],
    yaml: `name: perf_profile\nversion: 0.5.0\ntrigger: on_demand\ntools: [read_file, run_command]\nmodel: claude-sonnet-4.5\nprofiler: node`,
    usageData: [0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0,0]
  },
  {
    name: 'news_digest', cat: 'Research', source: 'Custom', active: true,
    desc: 'Curated tech news digest (daily)',
    longDesc: 'Aggregates and filters tech news from configured sources, summarizes top 5 stories with relevance scoring based on your interests.',
    agents: [{ name: 'researcher_42', av: 'R', cls: 'blue' }, { name: '_main', av: '_M', cls: 'salmon' }],
    yaml: `name: news_digest\nversion: 1.2.0\ntrigger: cron(0 8 * * *)\ntools: [web_search, web_fetch]\nmodel: gpt-5-mini\nsources: [hn, techcrunch, arxiv]`,
    usageData: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  },
])

const filteredSkills = computed(() => {
  let ss = skills as any[]
  if (activeCategory.value !== 'All') {
    ss = ss.filter(s => s.cat.toLowerCase() === activeCategory.value.toLowerCase())
  }
  if (activeSource.value !== 'All') {
    ss = ss.filter(s => s.source === activeSource.value)
  }
  if (searchQ.value) {
    const q = searchQ.value.toLowerCase()
    ss = ss.filter(s => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
  }
  return ss
})

function openModal(skill: any) {
  modalSkill.value = skill
}
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
}
.skills-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.skills-grid {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  align-content: start;
}
.skill-card {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 13px 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.skill-card:hover {
  border-color: var(--line-2);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
.skill-card.active {
  border-color: rgba(224,122,95,0.3);
  background: var(--accent-softer);
}
.skill-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.skill-name {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--fg);
}
.skill-card.active .skill-name { color: var(--accent); }
.skill-desc {
  font-size: 11.5px;
  color: var(--fg-dim);
  line-height: 1.4;
  flex: 1;
}
.skill-card-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.skill-source-tag {
  font-size: 10px;
  color: var(--fg-dimmer);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  padding: 1px 6px;
  border-radius: 3px;
}
.skill-avatars {
  display: flex;
  margin-left: auto;
}
.skill-avatars .av {
  margin-left: -4px;
  border: 1px solid var(--bg-1);
}

/* Modal channel item reuse */
.channel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 7px;
  border: 1px solid var(--line);
  margin-bottom: 4px;
}

.usage-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 64px;
  background: rgba(255,255,255,0.02);
  border-radius: 6px;
  padding: 6px;
}
.usage-bar-wrap {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 100%;
}
.usage-bar {
  width: 100%;
  background: var(--accent);
  border-radius: 2px;
  min-height: 2px;
  opacity: 0.7;
}
</style>
