'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PKG_ROOT = path.join(__dirname, '..');
const SECTIONS = ['purpose', 'triggers', 'behavior', 'output'];

function render(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(values, k) ? String(values[k]) : m,
  );
}

function readTrim(p) {
  return fs.readFileSync(p, 'utf8').replace(/\s+$/, '');
}

function buildSkill(skill, options) {
  const opts = options || {};
  const templatesDir = opts.templatesDir || path.join(PKG_ROOT, 'templates');
  const sharedDir = opts.sharedDir || path.join(PKG_ROOT, 'shared');

  const values = {
    NAME: skill.name,
    DESCRIPTION: skill.description,
    SHARED: readTrim(path.join(sharedDir, 'skill-common.md')),
  };
  for (const sec of SECTIONS) {
    const fragPath = path.join(templatesDir, 'fragments', `${skill.fragmentBase}.${sec}.md`);
    values[sec.toUpperCase()] = readTrim(fragPath);
  }

  const tmpl = fs.readFileSync(path.join(templatesDir, 'skill.md.tmpl'), 'utf8');
  const content = render(tmpl, values);
  return { name: skill.name, description: skill.description, content };
}

function buildAll(options) {
  const { skills } = require('./skills');
  return skills.map((s) => buildSkill(s, options));
}

module.exports = { render, buildSkill, buildAll, PKG_ROOT, SECTIONS };
