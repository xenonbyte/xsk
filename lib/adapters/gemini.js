'use strict';

const path = require('node:path');
const os = require('node:os');

const PLATFORM = 'gemini';

function skillsRoot(options) {
  const opts = options || {};
  const home = opts.home || os.homedir();
  return path.join(home, '.gemini', 'skills');
}

module.exports = { PLATFORM, skillsRoot };
