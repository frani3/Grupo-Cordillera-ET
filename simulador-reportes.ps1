# SCRIPT 5 - Simulador de Reportes Financieros
# Envia eventos financieros a MS5-REPORTES (puerto 8086)
# Uso: .\simulador-reportes.ps1
# Detener: Ctrl+C

$endpoint = "http://localhost:8086/api/reportes/evento"
$tipos = @("cierre-diario", "conciliacion", "descuento", "devolucion", "bonificacion")
$sucursales = @("norte", "sur", "centro", "oriente", "poniente")
$contador = 1

Write-Host "=== SCRIPT 5 - Simulador de Reportes Financieros ==="
Write-Host "Enviando eventos a: $endpoint"
Write-Host "Presiona Ctrl+C para detener`n"

while ($true) {
    $tipo = $tipos | Get-Random
    $evento = @{
        reporte_id  = "REP-" + (Get-Date -Format "yyyyMMdd") + "-" + (Get-Random -Minimum 1000 -Maximum 9999)
        tipo        = $tipo
        descripcion = "Evento de $tipo generado automaticamente"
        monto       = [math]::Round((Get-Random -Minimum 10000 -Maximum 10000000) / 100.0, 2)
        sucursal    = $sucursales | Get-Random
    }

    try {
        $body = $evento | ConvertTo-Json
        $resp = Invoke-RestMethod -Uri $endpoint -Method POST `
            -Body $body -ContentType "application/json"
        Write-Host "[$contador] OK -> rep_id=$($evento.reporte_id) tipo=$($evento.tipo) monto=`$$($evento.monto)"
    } catch {
        Write-Warning "[$contador] ERROR: $($_.Exception.Message)"
    }

    $contador++
    Start-Sleep -Seconds 4
}
