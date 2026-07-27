'use strict';

const ALL_PLATFORMS = ['claude', 'codex', 'opencode', 'gemini'];

const skills = [
  {
    name: 'xsk-think',
    description:
      'Plan before coding. Weigh options, surface ambiguities, and produce a decision-complete design, then stop for approval.',
    platforms: ALL_PLATFORMS.slice(),
    fragmentBase: 'think',
  },
  {
    name: 'xsk-bypass-claude',
    description:
      'Set the current project to Claude Code bypass-permissions mode by writing .claude/settings.local.json. Claude only.',
    platforms: ['claude'],
    fragmentBase: 'bypass-claude',
  },
  {
    name: 'xsk-skill-scaffold',
    description:
      'Bring an agent-skill project up to the xsk standard, or refuse if the target is not an agent-skill project.',
    platforms: ALL_PLATFORMS.slice(),
    fragmentBase: 'skill-scaffold',
  },
  {
    name: 'xsk-write-req',
    description:
      'Turn plain-language needs into a grounded requirement document in .xsk/requirements/, with a self-audit gate before it is finalized.',
    platforms: ALL_PLATFORMS.slice(),
    fragmentBase: 'write-req',
  },
  {
    name: 'xsk-archive-req',
    description:
      'Archive the active requirement document into .xsk/requirements/archive/ and leave zero active docs.',
    platforms: ALL_PLATFORMS.slice(),
    fragmentBase: 'archive-req',
  },
  {
    name: 'xsk-point',
    description:
      'Research one aspect into .xsk/points/ to a decision-complete landed plan using xsk-think discipline, then persist and manage it as a named point document.',
    platforms: ALL_PLATFORMS.slice(),
    fragmentBase: 'point',
  },
  {
    name: 'xsk-consume-point',
    description:
      'Fold selected .xsk/points into one .xsk/requirements doc via xsk-write-req, archiving consumed points write-before-remove and leaving unconsumed points active.',
    platforms: ALL_PLATFORMS.slice(),
    fragmentBase: 'consume-point',
  },
  {
    name: 'xsk-check',
    description:
      'Review a code change before it ships. Check scope drift, enforce hard stops, gate findings on evidence, then verify and sign off. Distilled from Waza /check.',
    platforms: ALL_PLATFORMS.slice(),
    fragmentBase: 'check',
  },
  {
    name: 'xsk-execute-plan',
    description:
      'Execute a small plan or request as context-isolated subagent tasks sharing one writable workspace, tracked in a .xsk/runs/ ledger, with one confirmation gate, no per-task code review, and unified acceptance. Explicit invocation only.',
    platforms: ALL_PLATFORMS.slice(),
    fragmentBase: 'execute-plan',
  },
];

function forPlatform(platform) {
  return skills.filter((s) => s.platforms.includes(platform));
}

function get(name) {
  return skills.find((s) => s.name === name);
}

module.exports = { skills, forPlatform, get, ALL_PLATFORMS };
