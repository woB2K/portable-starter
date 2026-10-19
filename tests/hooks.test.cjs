'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const kit = path.resolve(__dirname, '..');
const hooks = ['config-protection', 'check-console-log'];
const secret = 'PRIVATE_FIXTURE_CONTENT_NEVER_PRINT';

function fixture(t, repository = false) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portable hooks '));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const env = {
    PATH: process.env.PATH || '',
    HOME: directory,
    USERPROFILE: directory,
    TMPDIR: os.tmpdir(),
    TMP: os.tmpdir(),
    TEMP: os.tmpdir(),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: os.devNull,
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
    CLAUDE_PROJECT_DIR: directory,
  };
  for (const name of ['SystemRoot', 'WINDIR', 'PATHEXT']) {
    if (process.env[name]) env[name] = process.env[name];
  }
  const git = (...args) => {
    const result = spawnSync('git', ['-c', 'core.hooksPath=' + directory, ...args], {
      cwd: directory, env, encoding: 'utf8', timeout: 5000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  const write = (name, content = '') => {
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };
  if (repository) git('init', '--quiet');
  return { directory, env, git, write };
}

function invoke(name, f, payload, options = {}) {
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const result = spawnSync(process.execPath, [
    ...(options.preload ? ['--require', options.preload] : []),
    path.join(kit, 'hooks', `${name}.cjs`),
  ], {
    cwd: options.cwd || f.directory,
    env: { ...f.env, ...options.env },
    input, encoding: 'utf8', timeout: 8000, maxBuffer: 2 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.stdout.includes(secret), false);
  assert.equal(result.stderr.includes(secret), false);
  return result;
}

function editPayload(f, file, tool = 'Write') {
  const filePath = path.isAbsolute(file) ? path.relative(f.directory, file) : file;
  return { cwd: f.directory, tool_name: tool, tool_input: { file_path: filePath, content: secret } };
}

function allowed(result, clean = true) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  if (clean) assert.equal(result.stderr, '');
}

function advisory(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const output = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(output), ['systemMessage']);
  assert.equal(typeof output.systemMessage, 'string');
  assert.match(output.systemMessage, /console\.log/);
  return output.systemMessage;
}

function symlink(t, target, link, type = 'file') {
  try {
    fs.symlinkSync(target, link, type);
    return true;
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS', 'ENOTSUP'].includes(error.code)) {
      t.skip(`Symlinks unavailable: ${error.code}`);
      return false;
    }
    throw error;
  }
}

const protectedNames = [
  '.eslintrc', '.ESLINTRC.JS', '.eslintrc.shared.yml', '.eslintignore',
  'eslint.config.mjs', 'eslint.config.base.cts', 'ESLINT.CONFIG.MTS',
  '.prettierrc', '.prettierrc.mjs', '.prettierrc.ts', '.prettierrc.shared.toml',
  'prettier.config.mts', 'prettier.config.cts', '.PRETTIERIGNORE',
  'biome.json', 'BIOME.JSONC', '.biome.jsonc',
];

for (const tool of ['Write', 'Edit']) {
  test(`config guard blocks existing lint/format configs for ${tool}`, t => {
    const f = fixture(t);
    for (const name of protectedNames) {
      const file = f.write(name, '{}');
      const result = invoke('config-protection', f, editPayload(f, file, tool));
      assert.equal(result.status, 2, name);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /^\[config-protection\].*BLOCKED/);
      assert.match(result.stderr, /disable.*hook/i);
      assert.equal(fs.readFileSync(file, 'utf8'), '{}');
    }
  });
}

test('config guard permits first creation and unrelated project files', t => {
  const f = fixture(t);
  for (const name of protectedNames) {
    allowed(invoke('config-protection', f, editPayload(f, name)));
  }
  for (const name of [
    'src/index.ts', 'package.json', 'tsconfig.json', 'vite.config.ts',
    'vitest.config.ts', 'biome.custom.json', 'ruff.toml', '.stylelintrc',
  ]) {
    f.write(name, '{}');
    allowed(invoke('config-protection', f, editPayload(f, name)));
  }
});

test('config guard resolves relative paths against payload cwd, not process cwd', t => {
  const f = fixture(t);
  const elsewhere = path.join(f.directory, 'elsewhere');
  fs.mkdirSync(elsewhere);
  f.write('.prettierignore', 'dist');
  const result = invoke('config-protection', f, editPayload(f, '.prettierignore'), { cwd: elsewhere });
  assert.equal(result.status, 2);
});

test('config guard does not inspect another project or follow a parent symlink outside', t => {
  const f = fixture(t);
  const outside = fixture(t);
  const file = outside.write('eslint.config.ts', '{}');
  allowed(invoke('config-protection', f, editPayload(f, file)), false);
  const link = path.join(f.directory, 'external');
  if (!symlink(t, outside.directory, link, 'dir')) return;
  const result = invoke('config-protection', f, editPayload(f, 'external/eslint.config.ts'));
  allowed(result, false);
  assert.match(result.stderr, /^\[config-protection\]/);
});

test('config guard protects existing and dangling config symlinks without reading targets', t => {
  const f = fixture(t);
  const target = f.write('target.txt', secret);
  if (!symlink(t, target, path.join(f.directory, '.prettierrc'))) return;
  if (!symlink(t, path.join(f.directory, 'missing'), path.join(f.directory, '.eslintignore'))) return;
  for (const file of ['.prettierrc', '.eslintignore']) {
    assert.equal(invoke('config-protection', f, editPayload(f, file)).status, 2);
  }
});

test('config guard treats known filesystem access errors as protected, not first creation', t => {
  const f = fixture(t);
  const preload = f.write('stat-error.cjs', `
    const fs = require('node:fs');
    const original = fs.lstatSync;
    fs.lstatSync = function(file, ...args) {
      if (String(file).endsWith('eslint.config.js')) {
        const error = new Error('synthetic access error'); error.code = 'EACCES'; throw error;
      }
      return original.call(this, file, ...args);
    };
  `);
  const result = invoke('config-protection', f, editPayload(f, 'eslint.config.js'), { preload });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^\[config-protection\]/);
});

test('config guard ignores non-Write/Edit tools and sanitizes displayed config names', t => {
  const f = fixture(t);
  f.write('eslint.config.js', '{}');
  allowed(invoke('config-protection', f, editPayload(f, 'eslint.config.js', 'Bash')));
  const result = invoke('config-protection', f, editPayload(f, 'eslint.config.js'));
  assert.equal(result.stderr.split('\n').filter(Boolean).length, 1);
});

for (const name of hooks) {
  test(`${name} fails open on malformed, invalid, and byte-oversized input without passthrough`, t => {
    const f = fixture(t);
    for (const payload of [
      '', '{"broken":', 'null', '[]', 'true',
      JSON.stringify({ cwd: 42, tool_input: { file_path: [] }, private: secret }),
      JSON.stringify({ cwd: f.directory, padding: 'é'.repeat(600000), private: secret }),
    ]) {
      const result = invoke(name, f, payload);
      allowed(result, false);
      assert.match(result.stderr, new RegExp(`^\\[${name}\\]`));
      assert.ok(result.stderr.length < 400);
    }
  });
}

test('Stop advisory handles staged and untracked changes in an unborn repository', t => {
  const f = fixture(t, true);
  f.write('src/staged.ts', `const x = 1;\nconsole.log('${secret}');\n`);
  f.git('add', '--', 'src/staged.ts');
  f.write('src/untracked.ts', `console.log('${secret}');\n`);
  const message = advisory(invoke('check-console-log', f, { cwd: f.directory, private: secret }));
  assert.match(message, /"src\/staged\.ts":2/);
  assert.match(message, /"src\/untracked\.ts":1/);
});

test('Stop advisory includes unstaged edits and scans complete changed files', t => {
  const f = fixture(t, true);
  const file = f.write('src/unstaged.ts', `console.log('${secret}');\n`);
  f.git('add', '--', 'src/unstaged.ts');
  fs.appendFileSync(file, 'export const updated = true;\n');
  const message = advisory(invoke('check-console-log', f, { cwd: f.directory }));
  assert.match(message, /"src\/unstaged\.ts":1/);
});

test('Stop advisory accepts Vue and JS/TS module/JSX variants with spaced paths', t => {
  const f = fixture(t, true);
  for (const extension of ['vue', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'mts', 'cts']) {
    const file = `src/space name.${extension}`;
    f.write(file, `\nconsole.log('${secret}');`);
    const message = advisory(invoke('check-console-log', f, { cwd: f.directory }));
    assert.ok(message.includes(`"${file}":2`));
    fs.unlinkSync(path.join(f.directory, file));
  }
});

test('Stop advisory exclusions match exact segments and conventional test/config suffixes', t => {
  const f = fixture(t, true);
  for (const file of [
    'tests/example.ts', 'test/example.js', '__tests__/example.ts', '__mocks__/example.ts',
    'scripts/example.mjs', 'configs/example.ts', 'config/example.ts',
    'node_modules/example.ts', '.nuxt/example.ts', '.output/example.ts',
    'dist/example.ts', 'coverage/example.ts', 'generated/example.ts',
    'src/example.test.cts', 'src/example.spec.vue', 'nuxt.config.ts', 'vite.config.mjs',
  ]) f.write(file, `console.log('${secret}');`);
  allowed(invoke('check-console-log', f, { cwd: f.directory }));
  f.write('src/transcripts/latest.ts', `console.log('${secret}');`);
  assert.match(advisory(invoke('check-console-log', f, { cwd: f.directory })), /transcripts\/latest\.ts/);
});

test('Stop advisory is quiet for no issues, deleted files, binary files, and directories', t => {
  const f = fixture(t, true);
  f.write('src/clean.ts', 'export const value = 1;');
  const removed = f.write('src/deleted.ts', `console.log('${secret}');`);
  f.git('add', '--', 'src/deleted.ts');
  fs.unlinkSync(removed);
  f.write('src/binary.ts', Buffer.from(`\0console.log('${secret}');`));
  fs.mkdirSync(path.join(f.directory, 'directory.ts'));
  allowed(invoke('check-console-log', f, { cwd: f.directory, private: secret }));
});

test('Stop advisory does not scan file or directory symlinks, including outside parents', t => {
  const f = fixture(t, true);
  const outside = fixture(t);
  const target = outside.write('secret.ts', `console.log('${secret}');`);
  if (!symlink(t, target, path.join(f.directory, 'linked.ts'))) return;
  if (!symlink(t, outside.directory, path.join(f.directory, 'external'), 'dir')) return;
  if (!symlink(t, path.join(outside.directory, 'missing.ts'), path.join(f.directory, 'dangling.ts'))) return;
  allowed(invoke('check-console-log', f, { cwd: f.directory }));
});

test('Stop advisory restricts a subdirectory project within a larger repository', t => {
  const f = fixture(t, true);
  f.write('private/outside.ts', `console.log('${secret}');`);
  const project = path.join(f.directory, 'packages', 'app');
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, 'index.ts'), 'export const value = 1;');
  allowed(invoke('check-console-log', f, { cwd: project }, {
    env: { CLAUDE_PROJECT_DIR: project },
  }));
  fs.writeFileSync(path.join(project, 'index.ts'), `console.log('${secret}');`);
  assert.match(advisory(invoke('check-console-log', f, { cwd: project }, {
    env: { CLAUDE_PROJECT_DIR: project },
  })), /"index\.ts":1/);
});

test('Stop advisory uses supplied cwd rather than the hook process repository', t => {
  const f = fixture(t, true);
  const unrelated = fixture(t);
  f.write('actual.ts', `console.log('${secret}');`);
  const message = advisory(invoke('check-console-log', f, { cwd: f.directory }, {
    cwd: unrelated.directory, env: { CLAUDE_PROJECT_DIR: '' },
  }));
  assert.match(message, /"actual\.ts":1/);
});

test('Stop advisory ignores hostile inherited Git redirection variables', t => {
  const f = fixture(t, true);
  const outside = fixture(t, true);
  outside.write('outside.ts', `console.log('${secret}');`);
  allowed(invoke('check-console-log', f, { cwd: f.directory }, {
    env: { GIT_DIR: path.join(outside.directory, '.git'), GIT_WORK_TREE: outside.directory },
  }));
});

test('Stop advisory handles absent Git and non-repositories noncritically', t => {
  const f = fixture(t);
  for (const env of [{ PATH: '' }, {}]) {
    const result = invoke('check-console-log', f, { cwd: f.directory }, { env });
    allowed(result, false);
    assert.match(result.stderr, /^\[check-console-log\]/);
    assert.ok(result.stderr.length < 400);
  }
});

test('Stop advisory skips repeated stop-hook cycles', t => {
  const f = fixture(t, true);
  f.write('src/index.ts', `console.log('${secret}');`);
  allowed(invoke('check-console-log', f, { cwd: f.directory, stop_hook_active: true }));
});

test('Stop advisory limits warnings to five paths/line numbers without output injection', t => {
  const f = fixture(t, true);
  const name = process.platform === 'win32' ? 'src/quote-name.ts' : 'src/quote"\n\u001b[31m.ts';
  f.write(name, Array.from({ length: 20 }, () => `console.log('${secret}');`).join('\n'));
  const message = advisory(invoke('check-console-log', f, { cwd: f.directory }));
  assert.equal(message.split('\n').filter(line => /^- /.test(line)).length, 5);
  assert.ok(message.includes(`${JSON.stringify(name)}:1`));
  assert.ok(message.includes(`${JSON.stringify(name)}:5`));
  assert.equal(message.includes('\u001b'), false);
  assert.ok(message.length < 2400);
});

test('Stop advisory bounds candidate count and file/aggregate reading', t => {
  const f = fixture(t, true);
  for (let index = 0; index < 101; index++) {
    f.write(`src/${String(index).padStart(3, '0')}.ts`, index === 100 ? 'console.log(1);' : '');
  }
  let result = invoke('check-console-log', f, { cwd: f.directory });
  allowed(result, false);
  assert.match(result.stderr, /^\[check-console-log\].*limit/i);
  fs.rmSync(path.join(f.directory, 'src'), { recursive: true });
  f.write('large.ts', `console.log(1);${' '.repeat(256 * 1024)}`);
  result = invoke('check-console-log', f, { cwd: f.directory });
  allowed(result, false);
  assert.match(result.stderr, /^\[check-console-log\].*limit/i);
  fs.unlinkSync(path.join(f.directory, 'large.ts'));
  for (let index = 0; index < 5; index++) {
    f.write(`${index}.ts`, (index === 4 ? 'console.log(1);' : '').padEnd(256 * 1024, ' '));
  }
  result = invoke('check-console-log', f, { cwd: f.directory });
  allowed(result, false);
  assert.match(result.stderr, /^\[check-console-log\].*limit/i);
});

test('Stop advisory bounds Git subprocess duration and keeps failures off stdout', t => {
  const f = fixture(t, true);
  const preload = f.write('slow-git.cjs', `
    const childProcess = require('node:child_process');
    const original = childProcess.spawnSync;
    childProcess.spawnSync = function(command, args, options) {
      if (command !== 'git') return original(command, args, options);
      return original(process.execPath, ['-e', 'setTimeout(() => {}, 20000)'], options);
    };
  `);
  const started = Date.now();
  const result = invoke('check-console-log', f, { cwd: f.directory }, { preload });
  allowed(result, false);
  assert.match(result.stderr, /^\[check-console-log\]/);
  assert.ok(Date.now() - started < 5000, 'Git must time out instead of stalling Stop');
});

test('example registers only the opt-in PreToolUse and advisory Stop command hooks', () => {
  const settings = JSON.parse(fs.readFileSync(path.join(kit, 'examples', 'settings.hooks.json.example'), 'utf8'));
  assert.deepEqual(Object.keys(settings), ['hooks']);
  assert.deepEqual(Object.keys(settings.hooks).sort(), ['PreToolUse', 'Stop']);
  assert.equal(settings.hooks.PreToolUse[0].matcher, 'Write|Edit');
  for (const [event, name] of [['PreToolUse', 'config-protection'], ['Stop', 'check-console-log']]) {
    assert.equal(settings.hooks[event].length, 1);
    const entries = settings.hooks[event][0].hooks;
    assert.equal(entries.length, 1);
    assert.deepEqual(entries[0], {
      type: 'command', command: `node "\${CLAUDE_PROJECT_DIR}/.claude/hooks/${name}.cjs"`, timeout: 5,
    });
  }
});
