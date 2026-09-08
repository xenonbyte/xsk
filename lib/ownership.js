'use strict';

// Ownership constants and per-skill safety predicates shared by install and
// uninstall. Lives in its own module so install.js can run an uninstall-first
// reset without requiring uninstall.js (which would create a require cycle).

const fs = require('node:fs');
const path = require('node:path');

const { isSafePath, isInsideDir } = require('./manifest');

const PACKAGE_NAME = '@xenonbyte/xsk';
const MARKER = '.xsk-owned';

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch (e) {
    return false;
  }
}

function isExistingNonRegularFile(p) {
  try {
    return !fs.lstatSync(p).isFile();
  } catch (e) {
    if (e && e.code === 'ENOENT') return false;
    throw e;
  }
}

function hasUnsafeSkillPath(skillDir, skillFile, markerFile) {
  return (
    !isSafePath(skillDir, 'skill dir') ||
    !isSafePath(skillFile, 'skill file', { allowNonDirectoryTarget: true }) ||
    !isSafePath(markerFile, 'marker file', { allowNonDirectoryTarget: true }) ||
    isExistingNonRegularFile(skillFile) ||
    isExistingNonRegularFile(markerFile)
  );
}

function hasValidMarker(markerFile) {
  try {
    return fs.readFileSync(markerFile, 'utf8') === `${PACKAGE_NAME}\n`;
  } catch (e) {
    return false;
  }
}

// After failed backup recovery, only replace its target if the saved user
// content is still present in a regular, safely reachable backup file.
function hasFileContent(targetPath, content) {
  try {
    return isSafePath(targetPath, 'recovery backup', { allowNonDirectoryTarget: true })
      && fs.lstatSync(targetPath).isFile()
      && fs.readFileSync(targetPath).equals(content);
  } catch (e) {
    return false;
  }
}

function safeBackupForSkill(backups, skillFile, xskRoot, platform, skillsRoot) {
  const matches = backups.filter((b) => b.target === skillFile);
  const backup = matches[0];
  if (!backup) return { backup: null, unsafe: false, missing: false };
  if (matches.length > 1) return { backup, unsafe: true, missing: false };

  const expectedDir = path.join(xskRoot, 'install', 'backups', platform);
  const backupPath = path.resolve(backup.backup);
  if (!isInsideDir(path.resolve(backup.target), skillsRoot)) {
    return { backup, unsafe: true, missing: false };
  }
  if (!isInsideDir(backupPath, expectedDir)) {
    return { backup, unsafe: true, missing: false };
  }
  if (!isSafePath(expectedDir, 'backup dir') || !isSafePath(backupPath, 'backup file', { allowNonDirectoryTarget: true })) {
    return { backup, unsafe: true, missing: false };
  }
  if (!fs.existsSync(backupPath)) {
    return { backup, unsafe: false, missing: true };
  }
  const stat = fs.lstatSync(backupPath);
  if (!stat.isFile()) {
    return { backup, unsafe: true, missing: false };
  }
  return { backup, unsafe: false, missing: false };
}

module.exports = {
  PACKAGE_NAME,
  MARKER,
  isSymlink,
  isExistingNonRegularFile,
  hasUnsafeSkillPath,
  hasValidMarker,
  hasFileContent,
  safeBackupForSkill,
};
