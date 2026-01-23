# Script para testar se a API Key do SendGrid tem permissões corretas
# Uso: .\scripts\test-sendgrid-permissions.ps1

param(
    [string]$ApiKey = $env:SENDGRID_API_KEY
)

if ([string]::IsNullOrEmpty($ApiKey)) {
    Write-Host "Erro: SENDGRID_API_KEY não configurada" -ForegroundColor Red
    Write-Host "Configure a variável: `$env:SENDGRID_API_KEY = 'sua_chave_aqui'" -ForegroundColor Yellow
    Write-Host "Ou passe como parâmetro: .\scripts\test-sendgrid-permissions.ps1 -ApiKey 'sua_chave_aqui'" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "application/json"
}

Write-Host "Testando permissões da API Key do SendGrid..." -ForegroundColor Green
Write-Host ""

# Teste 1: Adicionar contato ao Marketing Contacts
Write-Host "1. Testando adição de contato ao Marketing Contacts..." -ForegroundColor Cyan
$testEmail = "teste-permissoes-$(Get-Date -Format 'yyyyMMddHHmmss')@exemplo.com"
$body = @{
    contacts = @(
        @{
            email = $testEmail
        }
    )
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.sendgrid.com/v3/marketing/contacts" `
        -Method Put `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "   ✅ SUCESSO: Contato adicionado com sucesso!" -ForegroundColor Green
    Write-Host "   Email de teste: $testEmail" -ForegroundColor Gray
    
    # Tentar buscar o contato para confirmar
    Start-Sleep -Seconds 2
    Write-Host ""
    Write-Host "2. Verificando se o contato foi salvo..." -ForegroundColor Cyan
    $searchBody = @{
        query = "email LIKE '$testEmail'"
    } | ConvertTo-Json
    
    try {
        $searchResponse = Invoke-RestMethod -Uri "https://api.sendgrid.com/v3/marketing/contacts/search" `
            -Method Post `
            -Headers $headers `
            -Body $searchBody `
            -ErrorAction Stop
        
        if ($searchResponse.result_count -gt 0) {
            Write-Host "   ✅ Contato encontrado no CRM!" -ForegroundColor Green
            Write-Host "   Total de resultados: $($searchResponse.result_count)" -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️  Contato não encontrado (pode levar alguns segundos para aparecer)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠️  Não foi possível buscar o contato: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "✅ SUA API KEY TEM AS PERMISSÕES CORRETAS!" -ForegroundColor Green
    Write-Host "   Você pode usar esta chave no .env como SENDGRID_API_KEY" -ForegroundColor Gray
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    Write-Host "   ❌ ERRO: Falha ao adicionar contato" -ForegroundColor Red
    Write-Host "   Status Code: $statusCode" -ForegroundColor Yellow
    
    if ($statusCode -eq 403) {
        Write-Host ""
        Write-Host "   🔴 PROBLEMA: Sua API Key NÃO tem permissões para Marketing Contacts!" -ForegroundColor Red
        Write-Host ""
        Write-Host "   SOLUÇÃO:" -ForegroundColor Yellow
        Write-Host "   1. Acesse: https://app.sendgrid.com/settings/api_keys" -ForegroundColor White
        Write-Host "   2. Crie uma NOVA API Key com:" -ForegroundColor White
        Write-Host "      - Full Access (recomendado), OU" -ForegroundColor White
        Write-Host "      - Restricted Access com permissão 'Marketing Contacts' habilitada" -ForegroundColor White
        Write-Host "   3. Copie a nova chave e atualize o .env" -ForegroundColor White
        Write-Host "   4. Reinicie o servidor" -ForegroundColor White
    } elseif ($statusCode -eq 401) {
        Write-Host ""
        Write-Host "   🔴 PROBLEMA: API Key inválida ou expirada!" -ForegroundColor Red
        Write-Host "   Verifique se a chave está correta no .env" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "   Erro: $($errorBody.errors.message -join ', ')" -ForegroundColor Red
    }
    
    Write-Host ""
    exit 1
}
