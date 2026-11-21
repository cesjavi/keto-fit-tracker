Set-Location -LiteralPath $PSScriptRoot
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D "$PSScriptRoot\.data\postgres" stop -m fast
