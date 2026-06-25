'use strict';

const path = require('node:path');
const os = require('node:os');

const PLATFORM = 'opencode';

function skillsRoot(options) {
  const opts = options || {};
  const home = opts.home || os.homedir();
  return path.join(home, '.config', 'opencode', 'skills');
}

module.exports = { PLATFORM, skillsRoot };
