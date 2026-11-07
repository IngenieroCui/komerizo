$ErrorActionPreference='Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
 $secure=(Get-Content -LiteralPath '.private/admin-key.dpapi' -Raw).Trim() | ConvertTo-SecureString
 $env:SUPABASE_URL='https://xmmqbbgivvfcsdlvtxqk.supabase.co'
 $env:SUPABASE_SERVICE_ROLE_KEY=[System.Net.NetworkCredential]::new('', $secure).Password
 node scripts/seed-demo.mjs
 if($LASTEXITCODE -ne 0){throw 'El seeder falló.'}
} finally {
 Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
 Pop-Location
}
