# SCRIPT 4 - Simulador de Empleados
# Envia registros de turno a MS4-EMPLEADOS (puerto 8085)
# Uso: .\simulador-empleados.ps1
# Detener: Ctrl+C

$endpoint   = "http://localhost:8085/api/empleados/registro"
$sucursales = @("Santiago Centro","Providencia","Las Condes","Maipu","Pudahuel","Nunoa","Vitacura","La Florida","Quilicura","San Bernardo")
$nombres    = @("Maria Lopez","Carlos Ruiz","Ana Torres","Pedro Diaz","Sofia Vargas","Diego Reyes","Valentina Mora","Felipe Castro","Camila Nunez","Andres Soto")
$turnos     = @("manana","tarde","noche")
$counter    = 0

function Get-FechaAleatoria {
    $diasAtras = Get-Random -Minimum 0 -Maximum 30
    return (Get-Date).AddDays(-$diasAtras).ToString("yyyy-MM-ddTHH:mm:ss")
}

function Esperar-Servicio {
    param([string]$Url)
    Write-Host "Esperando que MS4-Empleados este listo..." -ForegroundColor Yellow
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
    Write-Host "MS4-Empleados listo." -ForegroundColor Green
}

function Enviar-Empleado {
    $script:counter++
    $registro = @{
        empleado_id      = "EMP-" + (Get-Random -Minimum 100 -Maximum 999)
        nombre           = $nombres | Get-Random
        sucursal         = $sucursales | Get-Random
        turno            = $turnos | Get-Random
        horas_trabajadas = [math]::Round((Get-Random -Minimum 40 -Maximum 90) / 10.0, 1)
        fecha            = Get-FechaAleatoria
    }

    try {
        $body = $registro | ConvertTo-Json
        Invoke-RestMethod -Uri $endpoint -Method POST -Body $body -ContentType "application/json" | Out-Null
        Write-Host "[$script:counter] OK -> emp_id=$($registro.empleado_id) nombre=$($registro.nombre) turno=$($registro.turno) horas=$($registro.horas_trabajadas)"
    } catch {
        Write-Warning "[$script:counter] ERROR: $($_.Exception.Message)"
    }
}

Write-Host "=== SCRIPT 4 - Simulador de Empleados ===" -ForegroundColor Cyan
Write-Host "Enviando registros a: $endpoint"
Write-Host "Presiona Ctrl+C para detener`n"

Esperar-Servicio $endpoint
Write-Host "=== Carga inicial: enviando 40 registros historicos ===" -ForegroundColor Yellow
for ($i = 1; $i -le 40; $i++) {
    Enviar-Empleado
    if ($i % 10 -eq 0) { Write-Host "  [$i/40] registros enviados" -ForegroundColor DarkGray }
    Start-Sleep -Milliseconds 300
}
Write-Host "=== Carga inicial completada. Iniciando modo continuo... ===`n" -ForegroundColor Green

while ($true) {
    Enviar-Empleado
    Start-Sleep -Seconds 4
}
