# ai-coding-stack — bootstrap (ensures Node) then runs the setup menu.
$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
function Have($c){ [bool](Get-Command $c -ErrorAction SilentlyContinue) }
if (-not (Have "node")) {
  if (Have "winget") { winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements }
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
}
if (-not (Have "node")) { Write-Host "Node.js required. Reopen PowerShell and re-run." -ForegroundColor Red; exit 1 }
node "$Here\setup.js" $args
