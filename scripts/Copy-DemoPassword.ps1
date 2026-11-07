param([Parameter(Mandatory=$true)][string]$Email)
$ErrorActionPreference='Stop'
$vault=Join-Path $PSScriptRoot '../.private/demo-credentials.dpapi'
$secure=(Get-Content -LiteralPath $vault -Raw).Trim() | ConvertTo-SecureString
$accounts=([System.Net.NetworkCredential]::new('', $secure).Password | ConvertFrom-Json)
$account=$accounts | Where-Object email -eq $Email
if (!$account) { throw 'Correo demo no encontrado.' }
Set-Clipboard -Value $account.password
Write-Host 'Contraseña copiada al portapapeles privado. Pégala en el login y limpia el portapapeles después.'
