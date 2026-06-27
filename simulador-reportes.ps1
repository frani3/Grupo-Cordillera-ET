# SCRIPT 5 - Simulador de Reportes Financieros
# Envia eventos financieros a MS5-REPORTES (puerto 8086)
# Uso: .\simulador-reportes.ps1
# Detener: Ctrl+C

$endpoint   = "http://localhost:8086/api/reportes/evento"
$sucursales = @("Santiago Centro","Providencia","Las Condes","Maipu","Pudahuel","Nunoa","Vitacura","La Florida","Quilicura","San Bernardo")
$tipos      = @("cierre-diario","conciliacion","descuento","devolucion","bonificacion")
$counter    = 0

function Get-FechaAleatoria {
    $diasAtras = Get-Random -Minimum 0 -Maximum 30
    return (Get-Date).AddDays(-$diasAtras).ToString("yyyy-MM-ddTHH:mm:ss")
}

function Esperar-Servicio {
    param([string]$Url)
    Write-Host "Esperando que MS5-Reportes este listo..." -ForegroundColor Yellow
    while ($true) {
        try {
            Invoke-RestMethod -Uri $Url -Method POST -Body '{}' -ContentType "application/json" -TimeoutSec 3 | Out-Null
            break
        } catch {
            if ($_.Exception.Response -ne $null) { break }
            Write-Host "  Sin respuesta, reintentando en 3s..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 3
        }
    }
    Write-Host "MS5-Reportes listo." -ForegroundColor Green
}

function Enviar-Evento {
    $script:counter++
    $tipo  = $tipos | Get-Random
    $rndId = Get-Random -Minimum 10000 -Maximum 99999
    $evento = @{
        reporte_id  = "REP-" + $rndId
        tipo        = $tipo
        descripcion = "Evento de $tipo generado automaticamente"
        monto       = [math]::Round((Get-Random -Minimum 10000 -Maximum 10000000) / 100.0, 2)
        sucursal    = $sucursales | Get-Random
        fecha       = Get-FechaAleatoria
    }

    try {
        $body = $evento | ConvertTo-Json
        Invoke-RestMethod -Uri $endpoint -Method POST -Body $body -ContentType "application/json" | Out-Null
        Write-Host "[$script:counter] OK -> rep_id=$($evento.reporte_id) tipo=$($evento.tipo) monto=`$$($evento.monto)"
    } catch {
        Write-Warning "[$script:counter] ERROR: $($_.Exception.Message)"
    }
}

Write-Host "=== SCRIPT 5 - Simulador de Reportes Financieros ===" -ForegroundColor Cyan
Write-Host "Enviando eventos a: $endpoint"
Write-Host "Presiona Ctrl+C para detener`n"

Esperar-Servicio $endpoint
Write-Host "=== Carga inicial: enviando 40 registros historicos ===" -ForegroundColor Yellow
for ($i = 1; $i -le 40; $i++) {
    Enviar-Evento
    if ($i % 10 -eq 0) { Write-Host "  [$i/40] registros enviados" -ForegroundColor DarkGray }
    Start-Sleep -Milliseconds 300
}
Write-Host "=== Carga inicial completada. Iniciando modo continuo... ===`n" -ForegroundColor Green

while ($true) {
    Enviar-Evento
    Start-Sleep -Seconds 4
}
