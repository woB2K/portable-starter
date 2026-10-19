'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skills = [
  'vue-patterns',
  'nuxt-patterns',
  'nestjs-patterns',
  'prisma-patterns',
  'typeorm-patterns',
  'postgres-patterns',
  'api-design',
  'database-migrations',
];
const agents = [
  'planner',
  'stack-reviewer',
  'security-reviewer',
  'database-reviewer',
];
const required = [
  'README.md',
  'LICENSE',
  'SOURCES.md',
  'core/CLAUDE.md.template',
  'core/docs/project-start.md',
  'core/docs/architecture.md',
  ...['typescript', 'vue', 'nuxt'].map((name) => `rules/${name}.md`),
  ...skills.map((name) => `skills/${name}/SKILL.md`),
  ...agents.map((name) => `agents/${name}.md`),
  'hooks/config-protection.cjs',
  'hooks/check-console-log.cjs',
  'examples/settings.hooks.json.example',
];

// Structural checks only; this is not a general YAML parser or an LLM eval.
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    assert.equal(entry.isSymbolicLink(), false, `Unexpected symlink: ${file}`);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  assert.ok(match, `Missing frontmatter: ${file}`);
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([a-z][a-z-]*):\s*(.*)$/.exec(line);
    if (field) fields[field[1]] = field[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return { text, fields, raw: match[1] };
}

function checkLocalLinks(base) {
  for (const file of walk(base).filter((file) =>
    /\.(md|template)$/.test(file),
  )) {
    const text = fs
      .readFileSync(file, 'utf8')
      .replace(/```[^\n]*\n[\s\S]*?```/g, '');
    for (const link of text.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
      const target = link[1];
      if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(target)) continue;
      const relative = decodeURIComponent(target.split('#')[0]).replace(
        /:\d+$/,
        '',
      );
      if (!relative) continue;
      const resolved = path.resolve(path.dirname(file), relative);
      assert.ok(
        resolved.startsWith(`${base}${path.sep}`),
        `Link escapes kit: ${file} -> ${target}`,
      );
      assert.ok(fs.existsSync(resolved), `Broken link: ${file} -> ${target}`);
    }
  }
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(
    path.join(root, source),
    destination,
    fs.constants.COPYFILE_EXCL,
  );
}

test('kit contains all selected modules without an active configuration', () => {
  for (const file of required)
    assert.ok(fs.existsSync(path.join(root, file)), `Missing ${file}`);
  const files = walk(root).map((file) =>
    path.relative(root, file).split(path.sep).join('/'),
  );
  assert.ok(files.every((file) => !file.split('/').includes('.claude')));
  assert.ok(files.every((file) => path.basename(file) !== 'CLAUDE.md'));
  assert.ok(files.every((file) => path.basename(file) !== '.mcp.json'));
  assert.equal(fs.existsSync(path.join(root, 'package.json')), false);
});

test('skill metadata is discoverable and reference sections are present', () => {
  for (const name of skills) {
    const { fields, text } = frontmatter(
      path.join(root, 'skills', name, 'SKILL.md'),
    );
    assert.equal(fields.name, name);
    assert.match(fields.description, /^Use when\b/);
    for (const section of ['When to Use', 'How It Works', 'Examples']) {
      assert.match(text, new RegExp(`^## ${section}\\s*$`, 'm'));
    }
    assert.doesNotMatch(text, /ecc:|\$\{CLAUDE_PLUGIN_ROOT\}/);
  }
});

test('agents have restricted tools and do not need a plugin', () => {
  for (const name of agents) {
    const { fields } = frontmatter(path.join(root, 'agents', `${name}.md`));
    assert.equal(fields.name, name);
    assert.ok(fields.description);
    assert.equal(fields.model, 'sonnet');
    assert.deepEqual(
      fields.tools
        .split(',')
        .map((tool) => tool.trim())
        .sort(),
      ['Glob', 'Grep', 'Read'],
    );
  }
});

test('rules use path scoping without dangling upstream parents', () => {
  for (const name of ['typescript', 'vue', 'nuxt']) {
    const { raw, fields, text } = frontmatter(
      path.join(root, 'rules', `${name}.md`),
    );
    assert.ok(Object.hasOwn(fields, 'paths'));
    assert.match(raw, /^\s+-\s+['"]?[^\n]+/m);
    assert.doesNotMatch(raw, /^globs:/m);
    assert.doesNotMatch(text, /\.\.\/common\//);
  }
});

// This matcher deliberately covers only this kit's *, ** and brace-list syntax.
function matchesPath(pattern, file) {
  const escaped = pattern.replace(/[.+^$()|[\]\\]/g, '\\$&');
  const regex = escaped
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*')
    .replace(
      /\{([^}]+)\}/g,
      (_, choices) => `(?:${choices.split(',').join('|')})`,
    );
  return new RegExp(`^${regex}$`).test(file);
}

test('rule examples include Vue scripts but do not give Nest Nitro instructions', () => {
  const patterns = (name) =>
    frontmatter(path.join(root, 'rules', `${name}.md`))
      .raw.split(/\r?\n/)
      .map((line) => /^\s+-\s+['"]?([^'"]+)['"]?\s*$/.exec(line)?.[1])
      .filter(Boolean);
  const typescript = patterns('typescript');
  const nuxt = patterns('nuxt');
  assert.ok(
    typescript.some((pattern) =>
      matchesPath(pattern, 'apps/web/app/pages/index.vue'),
    ),
  );
  assert.ok(
    typescript.some((pattern) => matchesPath(pattern, 'apps/api/src/main.ts')),
  );
  assert.ok(
    nuxt.some((pattern) =>
      matchesPath(pattern, 'apps/web/server/api/health.get.ts'),
    ),
  );
  assert.ok(
    nuxt.some((pattern) =>
      matchesPath(pattern, 'apps/web/app/pages/index.vue'),
    ),
  );
  assert.ok(
    !nuxt.some((pattern) => matchesPath(pattern, 'apps/api/src/main.ts')),
  );
  assert.ok(
    !nuxt.some((pattern) => matchesPath(pattern, 'apps/api/server/service.ts')),
  );
});

test('upstream license, pinned provenance, and original supplements are disclosed', () => {
  const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2026 Maxim Vershinin/);
  assert.match(license, /THE SOFTWARE IS PROVIDED "AS IS"/);
  const sources = fs.readFileSync(path.join(root, 'SOURCES.md'), 'utf8');
  assert.match(sources, /76aaa77df6adc5b889e689007bf99b9a4f74af34/);
  assert.match(sources, /TypeORM/);
  assert.match(sources, /Nitro/);
});

test('example only registers the two opt-in command hooks', () => {
  const settings = JSON.parse(
    fs.readFileSync(
      path.join(root, 'examples/settings.hooks.json.example'),
      'utf8',
    ),
  );
  assert.deepEqual(Object.keys(settings), ['hooks']);
  assert.deepEqual(Object.keys(settings.hooks).sort(), ['PreToolUse', 'Stop']);
  const commands = Object.values(settings.hooks).flatMap((entries) =>
    entries.flatMap((entry) => entry.hooks),
  );
  assert.equal(commands.length, 2);
  for (const hook of commands) {
    assert.equal(hook.type, 'command');
    assert.match(
      hook.command,
      /^node "\$\{CLAUDE_PROJECT_DIR\}\/\.claude\/hooks\/[a-z-]+\.cjs"$/,
    );
    assert.ok(
      Number.isFinite(hook.timeout) && hook.timeout > 0 && hook.timeout <= 10,
    );
  }
  assert.equal(settings.hooks.PreToolUse[0].matcher, 'Write|Edit');
});

test('source files have no private absolute paths or external runtime dependencies', () => {
  const files = walk(root).filter(
    (file) => !file.startsWith(`${path.join(root, 'tests')}${path.sep}`),
  );
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /\/Users\/[^/\s]+\//, file);
    assert.doesNotMatch(text, /\/private\/tmp\/|CLAUDE_PLUGIN_ROOT|ecc:/, file);
    if (
      file.endsWith('.cjs') ||
      file.endsWith('.md') ||
      file.endsWith('.template')
    ) {
      assert.doesNotMatch(text, /<!-- draft -->|^\/\/ draft\s*$/m, file);
    }
    if (file.endsWith('.cjs')) {
      for (const match of text.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
        assert.ok(
          match[1].startsWith('node:') || match[1].startsWith('./'),
          `Non-standalone import: ${file}`,
        );
      }
    }
  }
});

test('hooks remain small CommonJS scripts without installation side effects', () => {
  for (const file of walk(path.join(root, 'hooks')).filter((file) =>
    file.endsWith('.cjs'),
  )) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(
      text.trimEnd().split(/\r?\n/).length <= 220,
      `Hook exceeds practical size limit: ${file}`,
    );
    assert.doesNotMatch(
      text,
      /\b(?:fetch|https?\.request|execSync|exec)\s*\(/,
      file,
    );
    assert.doesNotMatch(
      text,
      /\bnpx\b|npm install|claude -p|\bsetInterval\s*\(/,
      file,
    );
  }
});

test('onboarding exposes a manual copy route without an installer', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  for (const target of [
    '.claude/skills/',
    '.claude/rules/',
    '.claude/agents/',
    '.claude/hooks/',
  ]) {
    assert.ok(
      readme.includes(target),
      `Copy destination is missing: ${target}`,
    );
  }
  const template = fs.readFileSync(
    path.join(root, 'core/CLAUDE.md.template'),
    'utf8',
  );
  assert.ok(template.includes('docs/project-start.md'));
  assert.ok(template.includes('docs/architecture.md'));
  assert.ok(template.includes('TODO'));
  assert.doesNotMatch(
    template,
    /\b(?:npm|pnpm|yarn|bun)\s+(?:run|test|install)\b/,
  );
});

test('all local documentation links resolve inside the source kit', () =>
  checkLocalLinks(root));

for (const [variant, selection] of Object.entries({
  nitroPrisma: [
    'vue-patterns',
    'nuxt-patterns',
    'prisma-patterns',
    'postgres-patterns',
    'api-design',
    'database-migrations',
  ],
  nestTypeorm: [
    'vue-patterns',
    'nuxt-patterns',
    'nestjs-patterns',
    'typeorm-patterns',
    'postgres-patterns',
    'api-design',
    'database-migrations',
  ],
})) {
  test(`selective copy is self-contained: ${variant}`, (t) => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'portable starter '));
    t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
    copyFile('core/CLAUDE.md.template', path.join(temp, 'CLAUDE.md'));
    for (const name of ['project-start', 'architecture']) {
      copyFile(`core/docs/${name}.md`, path.join(temp, 'docs', `${name}.md`));
    }
    for (const name of selection) {
      const dest = path.join(temp, '.claude', 'skills', name, 'SKILL.md');
      copyFile(`skills/${name}/SKILL.md`, dest);
      assert.equal(frontmatter(dest).fields.name, name);
    }
    for (const name of ['typescript', 'vue', 'nuxt']) {
      copyFile(
        `rules/${name}.md`,
        path.join(temp, '.claude', 'rules', `${name}.md`),
      );
    }
    assert.equal(
      fs.existsSync(path.join(temp, '.claude', 'settings.json')),
      false,
    );
    assert.equal(
      fs.existsSync(
        path.join(
          temp,
          '.claude',
          'skills',
          variant === 'nitroPrisma' ? 'typeorm-patterns' : 'prisma-patterns',
        ),
      ),
      false,
    );
    checkLocalLinks(temp);
  });
}
