'use strict';

const path = require('node:path');
const os = require('node:os');

const PLATFORM = 'codex';

function skillsRoot(options) {
  const opts = options || {};
  const home = opts.home || os.homedir();
  return path.join(home, '.agents', 'skills');
}

module.exports = { PLATFORM, skillsRoot };
