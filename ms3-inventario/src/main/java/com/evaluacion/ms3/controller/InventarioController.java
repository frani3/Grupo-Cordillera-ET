package com.evaluacion.ms3.controller;

import com.evaluacion.ms3.model.ItemInventario;
import com.evaluacion.ms3.repository.InventarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventario")
public class InventarioController {

    private final InventarioRepository repo = InventarioRepository.getInstance();

    private LocalDate parseFecha(Object valor) {
        try {
            if (valor == null) return LocalDate.now();
            String s = valor.toString();
            return LocalDate.parse(s.contains("T") ? s.split("T")[0] : s);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    // POST /api/inventario/item — Script 3 envia items de inventario
    @PostMapping("/item")
    public ResponseEntity<?> recibirItem(@RequestBody Map<String, Object> payload) {
        String itemId   = (String) payload.get("item_id");
        String nombre   = (String) payload.get("nombre");
        String sucursal = (String) payload.get("sucursal");
        Object cantidad = payload.get("cantidad");
        Object precio   = payload.get("precio_unitario");

        if (itemId == null || itemId.isBlank()
         || nombre == null || nombre.isBlank()
         || sucursal == null || sucursal.isBlank()
         || cantidad == null || precio == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Campos obligatorios faltantes",
                                 "requeridos", "item_id, nombre, sucursal, cantidad, precio_unitario"));
        }

        int cantidadVal = ((Number) cantidad).intValue();
        long precioVal  = ((Number) precio).longValue();
        if (cantidadVal < 0 || precioVal < 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Valores inválidos: cantidad y precio deben ser >= 0"));
        }

        ItemInventario item = new ItemInventario(
                null,
                itemId,
                (String) payload.getOrDefault("categoria", "general"),
                nombre,
                cantidadVal,
                precioVal,
                sucursal,
                parseFecha(payload.get("fecha"))
        );
        return ResponseEntity.ok(repo.save(item));
    }

    // GET /api/inventario/items
    @GetMapping("/items")
    public ResponseEntity<List<ItemInventario>> listarItems() {
        return ResponseEntity.ok(repo.findAll());
    }

    // GET /api/inventario/health
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "ms3-inventario",
                "items", repo.count(),
                "timestamp", Instant.now().toString()
        ));
    }
}
