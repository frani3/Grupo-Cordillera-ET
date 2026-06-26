package com.evaluacion.ms4.controller;

import com.evaluacion.ms4.model.RegistroEmpleado;
import com.evaluacion.ms4.repository.EmpleadoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/empleados")
public class EmpleadoController {

    private final EmpleadoRepository repo = EmpleadoRepository.getInstance();

    // POST /api/empleados/registro — Script 4 envia registros de turno
    @PostMapping("/registro")
    public ResponseEntity<RegistroEmpleado> recibirRegistro(@RequestBody Map<String, Object> payload) {
        RegistroEmpleado r = new RegistroEmpleado(
                null,
                (String) payload.getOrDefault("empleado_id", "EMP-000"),
                (String) payload.getOrDefault("nombre", "Empleado"),
                (String) payload.getOrDefault("sucursal", "central"),
                (String) payload.getOrDefault("turno", "manana"),
                ((Number) payload.getOrDefault("horas_trabajadas", 0.0)).doubleValue(),
                LocalDate.now()
        );
        return ResponseEntity.ok(repo.save(r));
    }

    // GET /api/empleados/registros
    @GetMapping("/registros")
    public ResponseEntity<List<RegistroEmpleado>> listarRegistros() {
        return ResponseEntity.ok(repo.findAll());
    }

    // GET /api/empleados/health
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "ms4-empleados",
                "registros", repo.count(),
                "timestamp", Instant.now().toString()
        ));
    }
}
