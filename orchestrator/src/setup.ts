#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';

const MOS_DIR = path.join(os.homedir(), '.mos');

const DEFAULTS = {
  agents: {
    _main: {
      config: {
        name: '_main',
        cwd: os.homedir(),
        model: 'claude-sonnet-4-6',
        permissionMode: 'acceptEdits',
        allowedTools: ['bash', 'read_file', 'write_file', 'edit_file', 'web_search'],
        deniedTools: [],
      },
      systemPrompt: `You are Max OS — 1, a local-first agentic operating system.
You orchestrate specialized sub-agents to complete user goals.
Always prefer local execution. Be concise and action-oriented.`,
    },
  },
};

function mkdirp(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeIfAbsent(file: string, content: string, verbose = false) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, content, 'utf-8');
    if (verbose) console.log(`  created ${file.replace(os.homedir(), '~')}`);
  } else if (verbose) {
    console.log(`  exists  ${file.replace(os.homedir(), '~')}`);
  }
}

export function autoSetup(): void {
  const mainAgentDir = path.join(MOS_DIR, 'agents', '_main');
  if (fs.existsSync(mainAgentDir)) return;

  mkdirp(path.join(MOS_DIR, 'channels'));

  for (const [name, agent] of Object.entries(DEFAULTS.agents)) {
    const agentDir = path.join(MOS_DIR, 'agents', name);
    mkdirp(path.join(agentDir, 'memory'));
    writeIfAbsent(path.join(agentDir, 'config.json'), JSON.stringify(agent.config, null, 2));
    writeIfAbsent(path.join(agentDir, 'system-prompt.md'), agent.systemPrompt);
    writeIfAbsent(path.join(agentDir, 'memory', 'decisions.md'), '# Decisions\n');
    writeIfAbsent(path.join(agentDir, 'memory', 'patterns.md'), '# Patterns\n');
    writeIfAbsent(path.join(agentDir, 'memory', 'log.jsonl'), '');
  }

  console.log('[setup] ~/.mos/ initialized with default agent _main');
}

// Script direct : npm run setup
if (process.argv[1]?.endsWith('setup.ts') || process.argv[1]?.endsWith('setup.js')) {
  console.log('Max OS — 1 setup\n');
  mkdirp(path.join(MOS_DIR, 'channels'));
  for (const [name, agent] of Object.entries(DEFAULTS.agents)) {
    const agentDir = path.join(MOS_DIR, 'agents', name);
    mkdirp(path.join(agentDir, 'memory'));
    writeIfAbsent(path.join(agentDir, 'config.json'), JSON.stringify(agent.config, null, 2), true);
    writeIfAbsent(path.join(agentDir, 'system-prompt.md'), agent.systemPrompt, true);
    writeIfAbsent(path.join(agentDir, 'memory', 'decisions.md'), '# Decisions\n', true);
    writeIfAbsent(path.join(agentDir, 'memory', 'patterns.md'), '# Patterns\n', true);
    writeIfAbsent(path.join(agentDir, 'memory', 'log.jsonl'), '', true);
  }
  console.log('\nDone. Start the orchestrator with: npm run dev');
}
