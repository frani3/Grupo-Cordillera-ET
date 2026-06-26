# SCRIPT 4 — Simulador de Empleados
# Envia registros de turno a MS4-EMPLEADOS (puerto 8085)
# Uso: .\simulador-empleados.ps1
# Detener: Ctrl+C

$endpoint = "http://localhost:8085/api/empleados/registro"
$nombres = @("Maria Lopez", "Carlos Ruiz", "Ana Torres", "Pedro Diaz", "Sofia Vargas")
$sucursales = @("norte", "sur", "centro", "oriente", "poniente")
$turnos = @("manana", "tarde", "noche")
$contador = 1

Write-Host "=== SCRIPT 4 — Simulador de Empleados ==="
Write-Host "Enviando registros a: $endpoint"
Write-Host "Presiona Ctrl+C para detener`n"

while ($true) {
    $registro = @{
        empleado_id     = "EMP-" + (Get-Random -Minimum 100 -Maximum 999)
        nombre          = $nombres | Get-Random
        sucursal        = $sucursales | Get-Random
        turno           = $turnos | Get-Random
        horas_trabajadas = [math]::Round((Get-Random -Minimum 40 -Maximum 90) / 10.0, 1)
    }

    try {
        $body = $registro | ConvertTo-Json
        $resp = Invoke-RestMethod -Uri $endpoint -Method POST `
            -Body $body -ContentType "application/json"
        Write-Host "[$contador] OK → emp_id=$($registro.empleado_id) nombre=$($registro.nombre) turno=$($registro.turno) horas=$($registro.horas_trabajadas)"
    } catch {
        Write-Warning "[$contador] ERROR: $($_.Exception.Message)"
    }

    $contador++
    Start-Sleep -Seconds 4
}
