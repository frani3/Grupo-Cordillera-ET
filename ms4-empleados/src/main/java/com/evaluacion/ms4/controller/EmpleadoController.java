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

    private LocalDate parseFecha(Object valor) {
        try {
            if (valor == null) return LocalDate.now();
            String s = valor.toString();
            return LocalDate.parse(s.contains("T") ? s.split("T")[0] : s);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    // POST /api/empleados/registro — Script 4 envia registros de turno
    @PostMapping("/registro")
    public ResponseEntity<?> recibirRegistro(@RequestBody Map<String, Object> payload) {
        String empleadoId = (String) payload.get("empleado_id");
        String nombre     = (String) payload.get("nombre");
        String sucursal   = (String) payload.get("sucursal");
        String turno      = (String) payload.get("turno");
        Object horas      = payload.get("horas_trabajadas");

        if (empleadoId == null || empleadoId.isBlank()
         || nombre == null || nombre.isBlank()
         || sucursal == null || sucursal.isBlank()
         || turno == null || turno.isBlank()
         || horas == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Campos obligatorios faltantes",
                                 "requeridos", "empleado_id, nombre, sucursal, turno, horas_trabajadas"));
        }

        double horasVal = ((Number) horas).doubleValue();
        if (horasVal < 0 || horasVal > 24) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Horas trabajadas inválidas: debe estar entre 0 y 24"));
        }

        RegistroEmpleado r = new RegistroEmpleado(
                null,
                empleadoId,
                nombre,
                sucursal,
                turno,
                horasVal,
                parseFecha(payload.get("fecha"))
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
