# Script PowerShell para executar ETL
# Executa: .\src\scripts\product-import\run-etl.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando processamento ETL..." -ForegroundColor Cyan
Write-Host ""

# Tenta encontrar Node.js
$nodePath = $null

# Locais comuns do Node no Windows
$possiblePaths = @(
    "node",
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:ProgramFiles(x86)\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe"
)

foreach ($path in $possiblePaths) {
    try {
        $result = Get-Command $path -ErrorAction SilentlyContinue
        if ($result) {
            $nodePath = $result.Source
            break
        }
    } catch {
        continue
    }
}

if (-not $nodePath) {
    Write-Host "❌ Node.js não encontrado. Por favor, instale Node.js ou adicione ao PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternativa: Execute manualmente:" -ForegroundColor Yellow
    Write-Host "  node src/scripts/product-import/run-etl.js" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Node.js encontrado: $nodePath" -ForegroundColor Green
Write-Host ""

# Executa o script
$scriptPath = Join-Path $PSScriptRoot "run-etl.js"
$workingDir = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

Push-Location $workingDir
try {
    & $nodePath $scriptPath
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "✅ Processamento concluído!" -ForegroundColor Green
