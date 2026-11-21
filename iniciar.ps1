$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pg = 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe'
& $pg -D "$PSScriptRoot\.data\postgres" status *> $null
if ($LASTEXITCODE -ne 0) { & $pg -D "$PSScriptRoot\.data\postgres" -l "$PSScriptRoot\.data\postgres.log" start }
npm start
