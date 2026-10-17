const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const projectDirName = path.basename(rootDir);

function removeDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`[prepare-prisma] Could not remove ${targetPath}:`, error.message || error);
  }
}

function isTempArtifactName(name) {
  return name.includes('.tmp') || /tmp\d+/.test(name) || /\.tmp(?:\..+)?$/i.test(name);
}

function removeStalePrismaTempFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      removeStalePrismaTempFiles(fullPath);
      continue;
    }

    if (isTempArtifactName(entry.name)) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`[prepare-prisma] Removed stale Prisma temp file: ${fullPath}`);
      } catch (error) {
        console.warn(`[prepare-prisma] Could not remove stale file ${fullPath}:`, error.message || error);
      }
    }
  }
}

function stopProjectNodeProcesses() {
  if (process.platform !== 'win32') {
    return;
  }

  const script = `
    $project = '${projectDirName}';
    $procs = Get-CimInstance Win32_Process | Where-Object {
      $_.Name -eq 'node.exe' -and $_.CommandLine -match $project
    };

    if ($procs) {
      $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Output "Stopped node.exe pid:$($_.ProcessId)"; }
    }
  `;

  const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    stdio: 'inherit',
  });

  if (result.error) {
    console.warn('[prepare-prisma] Could not stop stale project Node processes:', result.error.message);
  }
}

function ensurePrismaClient(root = rootDir) {
  const clientDir = path.join(root, 'node_modules', '.prisma', 'client');
  if (fs.existsSync(clientDir)) {
    return;
  }

  const prismaBinary = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  console.log('[prepare-prisma] Prisma client is missing; running prisma generate...');

  const result = spawnSync(prismaBinary, ['prisma', 'generate'], {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('[prepare-prisma] Prisma generate failed.');
  }
}

function preparePrismaArtifacts(root = rootDir) {
  stopProjectNodeProcesses();

  const targets = [
    path.join(root, '.next'),
    path.join(root, 'node_modules', '.next'),
  ];

  for (const target of targets) {
    removeDir(target);
  }

  const prismaRoot = path.join(root, 'node_modules', '.prisma');
  removeStalePrismaTempFiles(prismaRoot);
  ensurePrismaClient(root);

  console.log('[prepare-prisma] Prisma cache and temp artifacts cleaned, generated client preserved.');
  return { rootDir: root, targets };
}

if (require.main === module) {
  preparePrismaArtifacts();
}

module.exports = {
  preparePrismaArtifacts,
  ensurePrismaClient,
  removeDir,
  removeStalePrismaTempFiles,
  stopProjectNodeProcesses,
  isTempArtifactName,
};
