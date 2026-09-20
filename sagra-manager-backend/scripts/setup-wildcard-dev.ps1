# setup-wildcard-dev.ps1
# Da lanciare UNA VOLTA SOLA (PowerShell come Amministratore), dalla cartella
# del progetto. Dopo questo, aggiungere un nuovo tenant di test in locale
# richiede solo add-tenant-host.ps1 <slug> — niente più mkcert/vite.config.

Write-Host "1/3 - Certificato wildcard (copre TUTTI i tenant futuri)..."
Set-Location "sagra-manager-backend\certs"
mkcert -install
mkcert "*.standmanager.local" "standmanager.local" "localhost" "127.0.0.1" "::1"
Set-Location "..\.."

Write-Host "2/3 - Aggiorna manualmente HTTPS_KEY_PATH/HTTPS_CERT_PATH nel .env backend"
Write-Host "      coi nomi file appena generati in sagra-manager-backend\certs\"

Write-Host "3/3 - Aggiorna vite.config.js del frontend con:"
Write-Host @"
  mkcert({ hosts: ['localhost', '127.0.0.1', '*.standmanager.local'] }),
  server: { ..., allowedHosts: ['.standmanager.local'] }
"@

Write-Host "`nFatto. Da ora, per un NUOVO tenant di test basta:"
Write-Host "  .\add-tenant-host.ps1 nomeslug"
