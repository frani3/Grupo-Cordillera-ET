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
    public ResponseEntity<ItemInventario> recibirItem(@RequestBody Map<String, Object> payload) {
        ItemInventario item = new ItemInventario(
                null,
                (String) payload.getOrDefault("item_id", "ITEM-000"),
                (String) payload.getOrDefault("categoria", "general"),
                (String) payload.getOrDefault("nombre", "item"),
                ((Number) payload.getOrDefault("cantidad", 0)).intValue(),
                ((Number) payload.getOrDefault("precio_unitario", 0.0)).doubleValue(),
                (String) payload.getOrDefault("sucursal", "central"),
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
