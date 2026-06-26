'use strict';

const crypto = require('node:crypto');

function contentSha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

module.exports = { contentSha256, isSha256 };
