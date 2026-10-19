const fs = require('fs');
const { spawnSync } = require('child_process');

const root = 'D:/Download/xtremedia/xtremedia-v2';
const envPath = root + '/.env.local';
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx < 0) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  env[key] = value;
}

const args = process.argv.slice(2);
const child = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', ...args], {
  cwd: root,
  env: { ...process.env, ...env },
  encoding: 'utf8',
  stdio: ['inherit', 'pipe', 'pipe'],
});

const stdout = child.stdout || '';
const stderr = child.stderr || '';
const log = (stdout || '') + (stderr || '');
if (log) {
  const tail = log.slice(-4000);
  process.stdout.write(tail);
}

console.log('\n[env-check]', {
  hasDatabaseUrl: !!env.DATABASE_URL,
  hasDirectUrl: !!env.DIRECT_URL,
  exit: child.status,
});

process.exit(child.status ?? 1);
