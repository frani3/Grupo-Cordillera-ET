# SCRIPT 3 - Simulador de Inventario
# Envia items de inventario a MS3-INVENTARIO (puerto 8084)
# Uso: .\simulador-inventario.ps1
# Detener: Ctrl+C

$endpoint = "http://localhost:8084/api/inventario/item"
$categorias = @("electronica", "ropa", "alimentos", "hogar", "deportes")
$sucursales = @("norte", "sur", "centro", "oriente", "poniente")
$contador = 1

Write-Host "=== SCRIPT 3 - Simulador de Inventario ==="
Write-Host "Enviando items a: $endpoint"
Write-Host "Presiona Ctrl+C para detener`n"

while ($true) {
    $item = @{
        item_id         = "ITEM-" + (Get-Random -Minimum 1000 -Maximum 9999)
        categoria       = $categorias | Get-Random
        nombre          = "Producto-" + (Get-Random -Minimum 100 -Maximum 999)
        cantidad        = Get-Random -Minimum 1 -Maximum 500
        precio_unitario = [math]::Round((Get-Random -Minimum 100 -Maximum 50000) / 100.0, 2)
        sucursal        = $sucursales | Get-Random
    }

    try {
        $body = $item | ConvertTo-Json
        $resp = Invoke-RestMethod -Uri $endpoint -Method POST `
            -Body $body -ContentType "application/json"
        Write-Host "[$contador] OK -> item_id=$($item.item_id) cat=$($item.categoria) qty=$($item.cantidad) sucursal=$($item.sucursal)"
    } catch {
        Write-Warning "[$contador] ERROR: $($_.Exception.Message)"
    }

    $contador++
    Start-Sleep -Seconds 4
}
