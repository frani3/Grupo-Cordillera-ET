# API Gateway — Nginx
Puerto: **80** | Tecnología: Nginx (Alpine)

## Propósito
Punto de entrada único al sistema. Enruta tráfico hacia MS Auth o BFF
según la ruta. No realiza validación de autenticación propia — esa
responsabilidad recae en el BFF (ServiceProxy).

## Rutas configuradas
| Ruta      | Destino             | Nota                              |
|-----------|---------------------|-----------------------------------|
| /health   | Nginx (directo)     | Responde sin upstream             |
| /auth/*   | ms-auth:8090        | Login y validación de tokens      |
| /*        | bff-service:8080    | Todo lo demás pasa por el BFF     |

## Ejemplo de routing

```
Cliente → GET /auth/login     → ms-auth:8090/auth/login
Cliente → GET /api/proxy/data → bff-service:8080/api/proxy/data
Cliente → GET /health         → { "status": "UP", "service": "api-gateway" }
```

## Configuración nginx.conf (resumen)
```nginx
location = /health {
    return 200 '{"status":"UP","service":"api-gateway","port":80}';
}
location /auth/ {
    proxy_pass http://ms-auth:8090/auth/;
}
location / {
    proxy_pass http://bff-service:8080;
}
```

El resolver DNS interno de Docker (`127.0.0.11 valid=10s`) garantiza que
nginx re-resuelva hostnames en cada petición, evitando IPs cacheadas de
contenedores recreados.

## Ejecutar
```bash
docker compose up -d api-gateway
```
