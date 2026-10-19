#!/usr/bin/env node
'use strict';

// Standalone PreToolUse guard for Write/Edit, not a filesystem security boundary.
// Bash, other tools, and embedded package.json config are deliberately not covered.
const fs = require('node:fs');
const path = require('node:path');
const MAX_INPUT = 1024 * 1024;
const protectedNames = new Set([
  '.eslintrc', '.eslintrc.js', '.prettierrc', '.prettierrc.js', '.eslintignore', '.prettierignore',
  'eslint.config', 'prettier.config',
  'biome.json', 'biome.jsonc', '.biome.json', '.biome.jsonc',
]);
const protectedPatterns = [
  /^(eslint|prettier)\.config(?:\.[a-z0-9_-]+)*\.[cm]?[jt]s$/i,
  /^\.(eslintrc|prettierrc)(?:\.[a-z0-9_-]+)*\.(?:[cm]?[jt]s|jsonc?|ya?ml|toml)$/i,
];

function diagnostic(message) {
  process.stderr.write(`[config-protection] ${message}\n`);
}

function within(root, file) {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function block() {
  diagnostic('BLOCKED: Existing ESLint/Prettier/Biome config or ignore file. Fix source code instead; for a legitimate config change, ask the user to disable this hook.');
  process.exitCode = 2;
}

function inspect(input) {
  if (typeof input.cwd !== 'string' || !path.isAbsolute(input.cwd) || input.cwd.includes('\0')) {
    diagnostic('Invalid project cwd; skipped.');
    return;
  }
  if (!['Write', 'Edit'].includes(input.tool_name)) return;
  const file = input.tool_input?.file_path;
  if (typeof file !== 'string' || !file || file.includes('\0')) {
    diagnostic('Invalid file path; skipped.');
    return;
  }
  const name = path.basename(file).toLowerCase();
  const legacyName = name === '.eslintrc' || name === '.prettierrc';
  if (!legacyName && !protectedNames.has(name) && !protectedPatterns.some(pattern => pattern.test(name))) return;

  const suppliedRoot = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  if (!path.isAbsolute(suppliedRoot)) {
    diagnostic('Invalid project root; skipped.');
    return;
  }
  const root = fs.realpathSync(suppliedRoot);
  const cwd = fs.realpathSync(input.cwd);
  const lexicalTarget = path.isAbsolute(file) ? path.resolve(file) : path.resolve(cwd, file);
  let target;
  try {
    // Canonicalize the existing parent to handle aliases such as /tmp ->
    // /private/tmp, while keeping the final entry under lstat control.
    target = path.join(fs.realpathSync(path.dirname(lexicalTarget)), path.basename(lexicalTarget));
  } catch (error) {
    if (error.code === 'ENOENT') return; // New parent/config bootstrap.
    block();
    return;
  }
  if (!within(root, cwd) || !within(root, target)) {
    diagnostic('Path outside project boundary; skipped.');
    return;
  }

  // Never traverse a parent symlink, even an internal one. The final entry uses
  // lstat, so existing/dangling config symlinks are protected without reading targets.
  const parents = path.relative(root, path.dirname(target)).split(path.sep).filter(Boolean);
  let parent = root;
  for (const part of parents) {
    parent = path.join(parent, part);
    try {
      const stat = fs.lstatSync(parent);
      if (stat.isSymbolicLink()) {
        diagnostic('Symlink parent outside supported scope; skipped.');
        return;
      }
      if (!stat.isDirectory()) return block();
    } catch (error) {
      if (error.code === 'ENOENT') return; // New directory/config bootstrap.
      return block(); // EACCES/EPERM/ELOOP/ENOTDIR are not proof of absence.
    }
  }
  try {
    fs.lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return;
  }
  block();
}

let chunks = [];
let bytes = 0;
let invalid = false;
process.stdin.on('data', chunk => {
  if (invalid) return;
  bytes += chunk.length;
  if (bytes > MAX_INPUT) {
    invalid = true;
    chunks = [];
    diagnostic('Input exceeded 1 MiB; skipped.');
    return;
  }
  chunks.push(chunk);
});
process.stdin.on('error', () => {
  invalid = true;
  chunks = [];
  diagnostic('Unable to read input; skipped.');
});
process.stdin.on('end', () => {
  if (invalid) return;
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error();
  } catch {
    diagnostic('Invalid JSON object; skipped.');
    return;
  }
  chunks = [];
  try {
    inspect(input);
  } catch {
    diagnostic('Unable to inspect project path; skipped.');
  }
});
