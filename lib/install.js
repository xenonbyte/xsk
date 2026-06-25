'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { buildSkill } = require('./generator');
const { skills: ALL_SKILLS } = require('./skills');
const { create, read, write, validate } = require('./manifest');

const PACKAGE_NAME = '@xenonbyte/xsk';
const MARKER = '.xsk-owned';
const ALL_PLATFORMS = ['claude', 'codex', 'opencode', 'gemini'];

function packageVersion() {
  try {
    return require('../package.json').version;
  } catch (e) {
    return '0.0.0';
  }
}

function rootFor(platform, platformRoots) {
  if (platformRoots && platformRoots[platform]) {
    return platformRoots[platform];
  }
  const adapter = require(`./adapters/${platform}.js`);
  return adapter.skillsRoot();
}

function atomicWriteFile(targetPath, content) {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, '.' + path.basename(targetPath) + '.tmp-' + process.pid);
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, targetPath);
}

function assertNotSymlink(targetPath, label) {
  try {
    if (fs.lstatSync(targetPath).isSymbolicLink()) {
      throw new Error(`refusing to install into symlinked ${label}: ${targetPath}`);
    }
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      return;
    }
    throw e;
  }
}

function ensurePlatformRoot(skillsRoot) {
  assertNotSymlink(skillsRoot, 'platform root');
  fs.mkdirSync(skillsRoot, { recursive: true });
  assertNotSymlink(skillsRoot, 'platform root');
}

function ensureSkillDir(skillDir) {
  assertNotSymlink(skillDir, 'skill dir');
  fs.mkdirSync(skillDir, { recursive: true });
  assertNotSymlink(skillDir, 'skill dir');
}

function previousInstallState(platform, xskRoot) {
  const empty = { backupsByTarget: new Map(), installedDirs: new Set() };
  let previous;
  try {
    previous = read(platform, { xskRoot });
  } catch (e) {
    throw new Error(`manifest for ${platform} is not valid JSON: ${e.message}`);
  }
  if (previous === null) {
    return empty;
  }
  if (!validate(previous, { expectedPlatform: platform })) {
    throw new Error(`manifest for ${platform} failed shape validation; refusing to install`);
  }
  const installedDirs = new Set(
    previous.installed_paths.filter((p) => {
      const base = path.basename(p);
      return base !== 'SKILL.md' && base !== MARKER;
    }),
  );
  return {
    backupsByTarget: new Map(previous.backups.map((b) => [b.target, { target: b.target, backup: b.backup }])),
    installedDirs,
  };
}

function rollback(createdPaths, backups, overwrittenPaths) {
  for (const p of createdPaths.slice().reverse()) {
    try {
      fs.rmSync(p, { force: true });
    } catch (e) {
      /* best effort */
    }
  }
  for (const entry of overwrittenPaths.slice().reverse()) {
    try {
      fs.mkdirSync(path.dirname(entry.target), { recursive: true });
      fs.writeFileSync(entry.target, entry.content, { mode: entry.mode });
      if (typeof entry.mode === 'number') {
        fs.chmodSync(entry.target, entry.mode);
      }
    } catch (e) {
      /* best effort */
    }
  }
  for (const b of backups) {
    try {
      if (fs.existsSync(b.backup)) {
        fs.mkdirSync(path.dirname(b.target), { recursive: true });
        fs.copyFileSync(b.backup, b.target);
      }
    } catch (e) {
      /* best effort */
    }
  }
}

function installPlatform({ platform, skillsRoot, xskRoot, version, skills }) {
  const manifest = create(platform, version);
  const installed = [];
  const backups = [];
  const rollbackBackups = [];
  const previousState = previousInstallState(platform, xskRoot);
  const backupsByTarget = previousState.backupsByTarget;
  const backupDir = path.join(xskRoot, 'install', 'backups', platform);
  const createdThisRun = [];
  const overwrittenThisRun = [];

  try {
    ensurePlatformRoot(skillsRoot);
    for (const skill of skills) {
      const built = buildSkill(skill);
      const skillDir = path.join(skillsRoot, skill.name);
      const skillFile = path.join(skillDir, 'SKILL.md');
      const markerFile = path.join(skillDir, MARKER);
      const skillDirExisted = fs.existsSync(skillDir);

      ensureSkillDir(skillDir);
      if (!skillDirExisted) {
        createdThisRun.push(skillDir);
      }
      assertNotSymlink(skillFile, 'skill file');
      assertNotSymlink(markerFile, 'marker file');
      const skillFileExisted = fs.existsSync(skillFile);
      const markerFileExisted = fs.existsSync(markerFile);

      if (skillFileExisted) {
        const stat = fs.statSync(skillFile);
        overwrittenThisRun.push({ target: skillFile, content: fs.readFileSync(skillFile), mode: stat.mode });
      }
      if (markerFileExisted) {
        const stat = fs.statSync(markerFile);
        overwrittenThisRun.push({ target: markerFile, content: fs.readFileSync(markerFile), mode: stat.mode });
      }

      if (fs.existsSync(skillFile) && !fs.existsSync(markerFile)) {
        fs.mkdirSync(backupDir, { recursive: true });
        const backup = path.join(backupDir, `${skill.name}.SKILL.md.bak`);
        fs.copyFileSync(skillFile, backup);
        const backupRecord = { target: skillFile, backup };
        backupsByTarget.set(skillFile, backupRecord);
        rollbackBackups.push(backupRecord);
      }

      atomicWriteFile(skillFile, built.content);
      if (!skillFileExisted) {
        createdThisRun.push(skillFile);
      }
      fs.writeFileSync(markerFile, `${PACKAGE_NAME}\n`);
      if (!markerFileExisted) {
        createdThisRun.push(markerFile);
      }

      if (!skillDirExisted || previousState.installedDirs.has(skillDir) || markerFileExisted) {
        installed.push(skillDir);
      }
      installed.push(skillFile, markerFile);
      const backup = backupsByTarget.get(skillFile);
      if (backup) {
        backups.push({ target: backup.target, backup: backup.backup });
      }
    }

    manifest.installed_paths = installed;
    manifest.backups = backups;
    write(platform, manifest, { xskRoot });
    return { platform, installed, backups, manifest };
  } catch (err) {
    rollback(createdThisRun, rollbackBackups, overwrittenThisRun);
    throw err;
  }
}

function install(options) {
  const opts = options || {};
  const selectedPlatforms = opts.platforms || ALL_PLATFORMS;
  const xskRoot = opts.xskRoot || path.join(os.homedir(), '.xsk');
  const version = opts.version || packageVersion();
  const skillsToInstall = opts.skills || ALL_SKILLS;

  const summary = { platforms: {} };
  for (const platform of selectedPlatforms) {
    const skillsRoot = rootFor(platform, opts.platformRoots);
    const applicable = skillsToInstall.filter((s) => s.platforms.includes(platform));
    if (applicable.length === 0) {
      summary.platforms[platform] = { platform, installed: [], backups: [], manifest: null, skipped: true };
      continue;
    }
    summary.platforms[platform] = installPlatform({
      platform,
      skillsRoot,
      xskRoot,
      version,
      skills: applicable,
    });
  }
  return summary;
}

module.exports = {
  install,
  installPlatform,
  atomicWriteFile,
  rootFor,
  PACKAGE_NAME,
  MARKER,
  ALL_PLATFORMS,
};
