#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const MAX_INPUT = 1024 * 1024; const MAX_FILES = 100; const MAX_BYTES = 256 * 1024; const GIT_TIMEOUT = 1000;
const SOURCE = /\.(?:vue|[cm]?[jt]sx?)$/i;
const EXCLUDED_SEGMENTS = new Set([
  'test', 'tests', '__tests__', '__mocks__', 'scripts', 'configs', 'config',
  'node_modules', '.nuxt', '.output', 'dist', 'coverage', 'generated',
]);
function diagnostic(message) {
  process.stderr.write(`[check-console-log] ${message}\n`);
}
function inside(root, file) {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function safeGitEnv() {
  const env = { ...process.env };
  for (const key of [
    'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_COMMON_DIR', 'GIT_CONFIG_COUNT',
  ]) delete env[key];
  env.GIT_CONFIG_NOSYSTEM = '1';
  env.GIT_CONFIG_SYSTEM = os.devNull;
  env.GIT_CONFIG_GLOBAL = os.devNull;
  env.GIT_TERMINAL_PROMPT = '0';
  env.GIT_OPTIONAL_LOCKS = '0';
  return env;
}
function git(args, cwd) {
  let result;
  try {
    result = spawnSync('git', ['-C', cwd, ...args], {
      cwd,
      env: safeGitEnv(),
      encoding: 'buffer',
      timeout: GIT_TIMEOUT,
      maxBuffer: 128 * 1024,
      windowsHide: true,
    });
  } catch {
    return null;
  }
  if (!result || result.error || result.status !== 0 || !result.stdout) return null;
  return result.stdout.toString('utf8');
}
function hasSymlinkParent(root, file) {
  const relative = path.relative(root, file);
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch {
      return true;
    }
    if (stat.isSymbolicLink()) return true;
  }
  return false;
}
function excluded(relative) {
  const segments = relative.split(path.sep);
  if (segments.some(segment => EXCLUDED_SEGMENTS.has(segment))) return true;
  const name = segments.at(-1) || '';
  return /\.(?:test|spec)\.(?:vue|[cm]?[jt]sx?)$/i.test(name)
    || /\.config\.[cm]?[jt]sx?$/i.test(name);
}
function warningsFor(file, relative) {
  let fd; let data;
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES) return { limited: stat.size > MAX_BYTES };
    fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const opened = fs.fstatSync(fd);
    if (!opened.isFile()) return { skipped: true };
    const buffer = Buffer.allocUnsafe(MAX_BYTES + 1);
    const count = fs.readSync(fd, buffer, 0, buffer.length, 0);
    if (count > MAX_BYTES || opened.size > MAX_BYTES) return { limited: true };
    data = buffer.subarray(0, count);
  } catch {
    return { skipped: true };
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
  }
  if (data.includes(0)) return { warnings: [], bytes: data.length };
  const text = data.toString('utf8');
  const warnings = []; let offset = 0;
  while ((offset = text.indexOf('console.log', offset)) !== -1) {
    warnings.push({ path: relative, line: text.slice(0, offset).split('\n').length });
    offset += 'console.log'.length;
  }
  return { warnings, bytes: data.length };
}
function inspect(input) {
  if (input.stop_hook_active === true) return;
  if (!input || typeof input !== 'object' || typeof input.cwd !== 'string'
      || !path.isAbsolute(input.cwd) || input.cwd.includes('\0')) {
    diagnostic('Invalid hook payload; skipped.');
    return;
  }
  const requested = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  if (typeof requested !== 'string' || !path.isAbsolute(requested) || requested.includes('\0')) {
    diagnostic('Invalid project path; skipped.');
    return;
  }
  let projectRoot;
  try {
    projectRoot = fs.realpathSync(requested);
    if (!fs.statSync(projectRoot).isDirectory()) throw new Error();
  } catch {
    diagnostic('Project path is unavailable; skipped.'); return;
  }
  const repoText = git(['rev-parse', '--show-toplevel'], projectRoot);
  if (!repoText) {
    diagnostic('Git repository unavailable; skipped.');
    return;
  }
  let repoRoot;
  try { repoRoot = fs.realpathSync(repoText.trim()); } catch {
    diagnostic('Git repository path unavailable; skipped.'); return;
  }
  if (!inside(repoRoot, projectRoot) && !inside(projectRoot, repoRoot)) {
    diagnostic('Project is outside the Git repository; skipped.'); return;
  }
  const listing = git(['status', '--porcelain=v1', '--no-renames', '--untracked-files=all', '-z'], repoRoot);
  if (listing === null) {
    diagnostic('Unable to list changed files; skipped.');
    return;
  }
  const names = [...new Set([...listing.matchAll(/(?:^|\0)[ MADRCU?!]{2} ([^\0]*)/g)].map(match => match[1]))]
    .filter(name => SOURCE.test(name));
  const candidates = [];
  for (const name of names) {
    const candidate = path.resolve(repoRoot, name);
    if (!inside(repoRoot, candidate) || !inside(projectRoot, candidate)) continue;
    const relative = path.relative(projectRoot, candidate);
    if (!relative || excluded(relative) || hasSymlinkParent(repoRoot, candidate)) continue;
    candidates.push({ candidate, relative });
  }
  if (candidates.length > MAX_FILES) {
    diagnostic(`Changed-file limit exceeded (${MAX_FILES}); skipped.`);
    return;
  }
  const warnings = [];
  let totalBytes = 0;
  for (const { candidate, relative } of candidates) {
    const result = warningsFor(candidate, relative);
    if (result.limited || totalBytes + (result.bytes || 0) > MAX_BYTES) {
      diagnostic(`File reading limit exceeded (${MAX_BYTES} bytes); skipped.`);
      return;
    }
    totalBytes += result.bytes || 0;
    warnings.push(...(result.warnings || []));
  }
  if (!warnings.length) return;
  const displayed = warnings.slice(0, 5).map(warning => `- ${JSON.stringify(warning.path)}:${warning.line}`);
  const systemMessage = `console.log found in changed source files.\n${displayed.join('\n')}\nRemove debug logging before committing.`;
  process.stdout.write(`${JSON.stringify({ systemMessage })}\n`);
}
let chunks = [];
let bytes = 0;
let oversized = false;
process.stdin.on('data', chunk => {
  if (oversized) return;
  bytes += chunk.length;
  if (bytes > MAX_INPUT) {
    oversized = true;
    chunks = [];
    diagnostic('Input exceeded 1 MiB; skipped.');
    return;
  }
  chunks.push(chunk);
});
process.stdin.on('error', () => {
  oversized = true;
  chunks = [];
  diagnostic('Unable to read input; skipped.');
});
process.stdin.on('end', () => {
  if (oversized) return;
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    diagnostic('Invalid JSON payload; skipped.');
    return;
  }
  chunks = [];
  try {
    inspect(input);
  } catch {
    diagnostic('Hook inspection failed; skipped.');
  }
});
