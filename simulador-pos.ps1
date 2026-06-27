# SCRIPT 1 - Simulador POS
# Envia transacciones POS a MS1 (puerto 8081)
# Uso: .\simulador-pos.ps1
# Detener: Ctrl+C

$url       = "http://localhost:8081/api/pos/simulate-mq"
$sucursales = @("Santiago Centro","Providencia","Las Condes","Maipu","Pudahuel","Nunoa","Vitacura","La Florida","Quilicura","San Bernardo")
$cajas     = @("CAJA-01","CAJA-02","CAJA-03","CAJA-04","CAJA-05")
$metodos   = @("DEBITO","CREDITO","EFECTIVO","TRANSFERENCIA")
$vendedores = @("VND-01","VND-02","VND-03","VND-04","VND-05","VND-07")
$skus      = @("LAPTOP-01","AURICULARES-01","TABLET-02","TECLADO-03","MOUSE-04","MONITOR-05","SILLA-06")
$precios   = @{
    "LAPTOP-01"=29990.0; "AURICULARES-01"=5990.0; "TABLET-02"=12500.0
    "TECLADO-03"=8990.0; "MOUSE-04"=3490.0; "MONITOR-05"=19990.0; "SILLA-06"=45000.0
}
$counter = 0

function Get-FechaAleatoria {
    $diasAtras = Get-Random -Minimum 0 -Maximum 30
    return (Get-Date).AddDays(-$diasAtras).ToString("yyyy-MM-ddTHH:mm:ss")
}

function Esperar-Servicio {
    param([string]$Url)
    Write-Host "Esperando que MS1-POS este listo..." -ForegroundColor Yellow
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
    Write-Host "MS1-POS listo." -ForegroundColor Green
}

function Enviar-POS {
    $script:counter++
    $sku      = $skus | Get-Random
    $precio   = $precios[$sku]
    $cant     = Get-Random -Minimum 1 -Maximum 4
    $total    = [math]::Round($precio * $cant, 2)
    $sucursal = $sucursales | Get-Random
    $trx      = "TRX-POS-$("{0:D4}" -f $script:counter)-$(Get-Random -Minimum 1000 -Maximum 9999)"
    $fecha    = Get-FechaAleatoria

    $body = "{`"trx_id`":`"$trx`",`"sucursal`":`"$sucursal`",`"caja_id`":`"$($cajas | Get-Random)`",`"fecha_hora`":`"$fecha`",`"monto_total`":$total,`"metodo_pago`":`"$($metodos | Get-Random)`",`"vendedor_id`":`"$($vendedores | Get-Random)`",`"productos`":[{`"sku`":`"$sku`",`"cantidad`":$cant,`"precio_unitario`":$precio}]}"

    try {
        Invoke-RestMethod -Method POST -Uri $url -ContentType "application/json" -Body $body | Out-Null
        Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] OK  | $trx | $sucursal | $sku x$cant | `$$total"
    } catch {
        Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] ERR | $trx | $($_.Exception.Message)"
    }
}

Write-Host "=== SCRIPT 1 - Simulador POS ===" -ForegroundColor Cyan
Write-Host "Enviando transacciones a: $url"
Write-Host "Presiona Ctrl+C para detener`n"

Esperar-Servicio $url
Write-Host "=== Carga inicial: enviando 100 registros historicos ===" -ForegroundColor Yellow
for ($i = 1; $i -le 100; $i++) {
    Enviar-POS
    if ($i % 20 -eq 0) { Write-Host "  [$i/100] registros enviados" -ForegroundColor DarkGray }
    Start-Sleep -Milliseconds 300
}
Write-Host "=== Carga inicial completada. Iniciando modo continuo... ===`n" -ForegroundColor Green

while ($true) {
    Enviar-POS
    Start-Sleep -Seconds 4
}
