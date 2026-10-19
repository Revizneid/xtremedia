$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot '.env.local'

if (-not (Test-Path $envFile)) {
  throw "Missing .env.local at $envFile"
}

foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*$' -or $line -match '^\s*#') {
    continue
  }

  $parts = $line -split '=', 2
  if ($parts.Count -ne 2) {
    continue
  }

  $name = $parts[0].Trim()
  $value = $parts[1].Trim().Trim('"').Trim("'")
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

Set-Location $repoRoot
npx prisma migrate deploy
exit $LASTEXITCODE
