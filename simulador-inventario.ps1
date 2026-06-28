# SCRIPT 3 - Simulador de Inventario
# Envia items de inventario a MS3-INVENTARIO (puerto 8084)
# Uso: .\simulador-inventario.ps1
# Detener: Ctrl+C

$endpoint   = "http://localhost:8084/api/inventario/item"
$sucursales = @("Santiago Centro","Providencia","Las Condes","Maipu","Pudahuel","Nunoa","Vitacura","La Florida","Quilicura","San Bernardo")
$categorias = @("electronica","ropa","alimentos","hogar","deportes")
$counter    = 0

function Get-FechaAleatoria {
    $diasAtras = Get-Random -Minimum 0 -Maximum 30
    return (Get-Date).AddDays(-$diasAtras).ToString("yyyy-MM-ddTHH:mm:ss")
}

function Esperar-Servicio {
    param([string]$Url)
    Write-Host "Esperando que MS3-Inventario este listo..." -ForegroundColor Yellow
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
    Write-Host "MS3-Inventario listo." -ForegroundColor Green
}

function Enviar-Item {
    $script:counter++
    $categoria = $categorias | Get-Random
    $precio_raw = switch ($categoria) {
        "electronica" { Get-Random -Minimum 9990  -Maximum 299990 }
        "ropa"        { Get-Random -Minimum 4990  -Maximum 49990  }
        "alimentos"   { Get-Random -Minimum 490   -Maximum 9990   }
        "hogar"       { Get-Random -Minimum 2990  -Maximum 89990  }
        "deportes"    { Get-Random -Minimum 2990  -Maximum 69990  }
        default       { Get-Random -Minimum 990   -Maximum 29990  }
    }
    $precio_unitario = [int]([math]::Round($precio_raw / 10) * 10)
    $item = @{
        item_id         = "ITEM-" + (Get-Random -Minimum 1000 -Maximum 9999)
        categoria       = $categoria
        nombre          = "Producto-" + (Get-Random -Minimum 100 -Maximum 999)
        cantidad        = Get-Random -Minimum 1 -Maximum 500
        precio_unitario = $precio_unitario
        sucursal        = $sucursales | Get-Random
        fecha           = Get-FechaAleatoria
    }

    try {
        $body = $item | ConvertTo-Json
        Invoke-RestMethod -Uri $endpoint -Method POST -Body $body -ContentType "application/json" | Out-Null
        Write-Host "[$script:counter] OK -> item_id=$($item.item_id) cat=$($item.categoria) qty=$($item.cantidad) sucursal=$($item.sucursal)"
    } catch {
        Write-Warning "[$script:counter] ERROR: $($_.Exception.Message)"
    }
}

Write-Host "=== SCRIPT 3 - Simulador de Inventario ===" -ForegroundColor Cyan
Write-Host "Enviando items a: $endpoint"
Write-Host "Presiona Ctrl+C para detener`n"

Esperar-Servicio $endpoint
Write-Host "=== Carga inicial: enviando 100 registros historicos ===" -ForegroundColor Yellow
for ($i = 1; $i -le 100; $i++) {
    Enviar-Item
    if ($i % 20 -eq 0) { Write-Host "  [$i/100] registros enviados" -ForegroundColor DarkGray }
    Start-Sleep -Milliseconds 300
}
Write-Host "=== Carga inicial completada. Iniciando modo continuo... ===`n" -ForegroundColor Green

while ($true) {
    Enviar-Item
    Start-Sleep -Seconds 4
}
