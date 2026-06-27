# SCRIPT 2 - Simulador Online
# Envia ventas online a MS2 (puerto 8083)
# Uso: .\simulador-online.ps1
# Detener: Ctrl+C

$url        = "http://localhost:8083/api/online/venta"
$sucursales = @("Santiago Centro","Providencia","Las Condes","Maipu","Pudahuel","Nunoa","Vitacura","La Florida","Quilicura","San Bernardo")
$plataformas = @("web","app","marketplace")
$metodos    = @("tarjeta","transferencia","paypal","mercadopago")
$emails     = @("juan@mail.com","maria@mail.com","pedro@mail.com","ana@mail.com","luis@mail.com")
$skus       = @("LAPTOP-001","MOUSE-002","TECLADO-003","AURIF-004","CAMARA-005","HUB-006")
$precios    = @{
    "LAPTOP-001"=899990; "MOUSE-002"=12990; "TECLADO-003"=34990
    "AURIF-004"=49990;   "CAMARA-005"=79990; "HUB-006"=19990
}
$counter = 0

function Get-FechaAleatoria {
    $diasAtras = Get-Random -Minimum 0 -Maximum 30
    return (Get-Date).AddDays(-$diasAtras).ToString("yyyy-MM-ddTHH:mm:ss")
}

function Esperar-Servicio {
    param([string]$Url)
    Write-Host "Esperando que MS2-Online este listo..." -ForegroundColor Yellow
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
    Write-Host "MS2-Online listo." -ForegroundColor Green
}

function Enviar-Online {
    $script:counter++
    $sku       = $skus | Get-Random
    $precio    = $precios[$sku]
    $cant      = Get-Random -Minimum 1 -Maximum 4
    $total     = [math]::Round($precio * $cant, 2)
    $sucursal  = $sucursales | Get-Random
    $plataforma = $plataformas | Get-Random
    $trx       = "TRX-ONLINE-$("{0:D4}" -f $script:counter)-$(Get-Random -Minimum 1000 -Maximum 9999)"
    $fecha     = Get-FechaAleatoria

    $body = "{`"trx_id`":`"$trx`",`"sucursal`":`"$sucursal`",`"fecha_hora`":`"$fecha`",`"monto_total`":$total,`"metodo_pago`":`"$($metodos | Get-Random)`",`"canal`":`"online`",`"plataforma`":`"$plataforma`",`"email_cliente`":`"$($emails | Get-Random)`",`"direccion_envio`":`"Av. Test 123`",`"productos`":[{`"sku`":`"$sku`",`"cantidad`":$cant,`"precio_unitario`":$precio}]}"

    try {
        Invoke-RestMethod -Method POST -Uri $url -ContentType "application/json" -Body $body | Out-Null
        Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] OK  | $trx | $sucursal | $plataforma | $sku x$cant | `$$total"
    } catch {
        Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] ERR | $trx | $($_.Exception.Message)"
    }
}

Write-Host "=== SCRIPT 2 - Simulador Online ===" -ForegroundColor Cyan
Write-Host "Enviando ventas a: $url"
Write-Host "Presiona Ctrl+C para detener`n"

Esperar-Servicio $url
Write-Host "=== Carga inicial: enviando 100 registros historicos ===" -ForegroundColor Yellow
for ($i = 1; $i -le 100; $i++) {
    Enviar-Online
    if ($i % 20 -eq 0) { Write-Host "  [$i/100] registros enviados" -ForegroundColor DarkGray }
    Start-Sleep -Milliseconds 300
}
Write-Host "=== Carga inicial completada. Iniciando modo continuo... ===`n" -ForegroundColor Green

while ($true) {
    Enviar-Online
    Start-Sleep -Seconds 4
}
