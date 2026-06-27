param()
# Lanza los 5 simuladores en ventanas PowerShell separadas
# Uso: .\run-simuladores.ps1

$root = $PSScriptRoot

$scripts = @(
    "simulador-pos.ps1",
    "simulador-online.ps1",
    "simulador-inventario.ps1",
    "simulador-empleados.ps1",
    "simulador-reportes.ps1"
)

Write-Host "Iniciando $($scripts.Count) simuladores..." -ForegroundColor Cyan

foreach ($s in $scripts) {
    $path = Join-Path $root $s
    Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$path`""
    Write-Host "  OK  $s" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "Todos los simuladores iniciados." -ForegroundColor Cyan
Write-Host "Abre http://localhost:3000 y espera 15 segundos para ver datos." -ForegroundColor Yellow
