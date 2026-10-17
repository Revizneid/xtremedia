const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { preparePrismaArtifacts } = require('./prepare-prisma.js');

test('preparePrismaArtifacts keeps the generated Prisma client intact', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xtremedia-prisma-'));
  const generatedClientDir = path.join(tmpRoot, 'node_modules', '.prisma', 'client');
  fs.mkdirSync(generatedClientDir, { recursive: true });
  const generatedMarker = path.join(generatedClientDir, 'default.js');
  fs.writeFileSync(generatedMarker, 'module.exports = {};');

  const nextDir = path.join(tmpRoot, '.next');
  fs.mkdirSync(nextDir, { recursive: true });

  preparePrismaArtifacts(tmpRoot);

  assert.ok(fs.existsSync(generatedMarker), 'generated Prisma client files must remain');
  assert.ok(!fs.existsSync(nextDir) || fs.readdirSync(nextDir).length === 0, 'next cache may be cleaned but not Prisma client');
});
