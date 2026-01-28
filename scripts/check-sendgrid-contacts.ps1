# Script PowerShell para verificar contatos adicionados ao SendGrid via API
# Uso: .\scripts\check-sendgrid-contacts.ps1 [-Email "email@exemplo.com"]

param(
    [string]$Email = ""
)

$SENDGRID_API_KEY = $env:SENDGRID_API_KEY

if ([string]::IsNullOrEmpty($SENDGRID_API_KEY)) {
    Write-Host "Erro: SENDGRID_API_KEY não configurada" -ForegroundColor Red
    Write-Host "Configure a variável: `$env:SENDGRID_API_KEY = 'sua_chave_aqui'"
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $SENDGRID_API_KEY"
    "Content-Type" = "application/json"
}

if ([string]::IsNullOrEmpty($Email)) {
    Write-Host "Buscando todos os contatos (primeiros 10)..." -ForegroundColor Green
    $response = Invoke-RestMethod -Uri "https://api.sendgrid.com/v3/marketing/contacts?page_size=10" `
        -Method Get `
        -Headers $headers
    
    $response | ConvertTo-Json -Depth 10
} else {
    Write-Host "Buscando contato: $Email" -ForegroundColor Green
    $body = @{
        query = "email LIKE '$Email'"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "https://api.sendgrid.com/v3/marketing/contacts/search" `
        -Method Post `
        -Headers $headers `
        -Body $body
    
    $response | ConvertTo-Json -Depth 10
}
