package com.evaluacion.bff.controller;

import com.evaluacion.bff.auth.AuthClient;
import com.evaluacion.bff.client.Ms3Client;
import com.evaluacion.bff.client.Ms4Client;
import com.evaluacion.bff.client.Ms5Client;
import com.evaluacion.bff.client.OrqIndClient;
import com.evaluacion.bff.client.OrqRepClient;
import com.evaluacion.bff.model.DataResponse;
import com.evaluacion.bff.proxy.ServiceProxy;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

// PATRON PROXY: Client en la estructura. Solo conoce ServiceProxy,
// no sabe si habla con el servicio real o un intermediario.
@RestController
@RequestMapping("/api/proxy")
public class BffController {

    private final ServiceProxy serviceProxy;
    private final AuthClient authClient;
    private final OrqIndClient orqIndClient;
    private final OrqRepClient orqRepClient;
    private final Ms3Client ms3Client;
    private final Ms4Client ms4Client;
    private final Ms5Client ms5Client;

    public BffController(ServiceProxy serviceProxy, AuthClient authClient,
                         OrqIndClient orqIndClient, OrqRepClient orqRepClient,
                         Ms3Client ms3Client, Ms4Client ms4Client, Ms5Client ms5Client) {
        this.serviceProxy = serviceProxy;
        this.authClient = authClient;
        this.orqIndClient = orqIndClient;
        this.orqRepClient = orqRepClient;
        this.ms3Client = ms3Client;
        this.ms4Client = ms4Client;
        this.ms5Client = ms5Client;
    }

    // POST /api/proxy/login — delega login a MS AUTH (sin requerir token previo)
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        Map<String, Object> resp = authClient.login(
                body.getOrDefault("username", ""),
                body.getOrDefault("password", "")
        );
        if (resp.containsKey("error")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(resp);
        }
        return ResponseEntity.ok(resp);
    }

    // GET /api/proxy/data?id={requestId}
    @GetMapping("/data")
    public ResponseEntity<DataResponse> getData(
            @RequestHeader(value = "Authorization", required = false) String authToken,
            @RequestParam(value = "id", defaultValue = "default") String requestId) {
        try {
            DataResponse response = serviceProxy.fetchData(requestId, authToken);
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(DataResponse.error(e.getMessage()));
        }
    }

    // GET /api/proxy/ventas — requiere Bearer token
    @GetMapping("/ventas")
    public ResponseEntity<List<Map<String, Object>>> getVentas(
            @RequestHeader(value = "Authorization", required = false) String authToken) {
        try {
            List<Map<String, Object>> ventas = serviceProxy.fetchVentas(authToken);
            return ResponseEntity.ok(ventas);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    // GET /api/proxy/indicadores — agrega datos de ORQ-IND
    @GetMapping("/indicadores")
    public ResponseEntity<Map<String, Object>> getIndicadores(
            @RequestHeader(value = "Authorization", required = false) String authToken,
            @RequestParam(defaultValue = "ind-bff") String id) {
        if (!authClient.validate(authToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido. Use POST /api/proxy/login"));
        }
        return ResponseEntity.ok(orqIndClient.fetchIndicadores(id));
    }

    // GET /api/proxy/reportes — agrega datos de ORQ-REP
    @GetMapping("/reportes")
    public ResponseEntity<Map<String, Object>> getReportes(
            @RequestHeader(value = "Authorization", required = false) String authToken,
            @RequestParam(defaultValue = "rep-bff") String id) {
        if (!authClient.validate(authToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido. Use POST /api/proxy/login"));
        }
        return ResponseEntity.ok(orqRepClient.fetchReportes(id));
    }

    // GET /api/proxy/dashboard — agrega los 3 dominios en paralelo
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestHeader(value = "Authorization", required = false) String authToken) {
        if (!authClient.validate(authToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token inválido. Use POST /api/proxy/login"));
        }
        try {
            CompletableFuture<List<Map<String, Object>>> ventasFut =
                    CompletableFuture.supplyAsync(() -> serviceProxy.fetchVentas(authToken));
            CompletableFuture<Map<String, Object>> indFut =
                    CompletableFuture.supplyAsync(() -> orqIndClient.fetchIndicadores("dashboard"));
            CompletableFuture<Map<String, Object>> repFut =
                    CompletableFuture.supplyAsync(() -> orqRepClient.fetchReportes("dashboard"));

            return ResponseEntity.ok(Map.of(
                    "ventas", ventasFut.join(),
                    "indicadores", indFut.join(),
                    "reportes", repFut.join(),
                    "timestamp", Instant.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // GET /api/proxy/datos/inventario — datos crudos de MS3
    @GetMapping("/datos/inventario")
    public ResponseEntity<List<Map<String, Object>>> getDatosInventario(
            @RequestHeader(value = "Authorization", required = false) String authToken) {
        if (!authClient.validate(authToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(ms3Client.fetchItems());
    }

    // GET /api/proxy/datos/empleados — datos crudos de MS4
    @GetMapping("/datos/empleados")
    public ResponseEntity<List<Map<String, Object>>> getDatosEmpleados(
            @RequestHeader(value = "Authorization", required = false) String authToken) {
        if (!authClient.validate(authToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(ms4Client.fetchRegistros());
    }

    // GET /api/proxy/datos/eventos — datos crudos de MS5
    @GetMapping("/datos/eventos")
    public ResponseEntity<List<Map<String, Object>>> getDatosEventos(
            @RequestHeader(value = "Authorization", required = false) String authToken) {
        if (!authClient.validate(authToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(ms5Client.fetchEventos());
    }

    // GET /api/proxy/health — publico
    @GetMapping("/health")
    public ResponseEntity<DataResponse> health() {
        return ResponseEntity.ok(DataResponse.ok("BFF operativo", "bff-service"));
    }
}
