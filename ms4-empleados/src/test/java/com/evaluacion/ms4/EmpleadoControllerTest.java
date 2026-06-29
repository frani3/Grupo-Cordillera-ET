package com.evaluacion.ms4;

import com.evaluacion.ms4.controller.EmpleadoController;
import com.evaluacion.ms4.model.RegistroEmpleado;
import com.evaluacion.ms4.repository.EmpleadoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmpleadoControllerTest {

    @Mock
    private EmpleadoRepository repo;

    @InjectMocks
    private EmpleadoController controller;

    private RegistroEmpleado emp1;
    private RegistroEmpleado emp2;

    @BeforeEach
    void setUp() {
        emp1 = new RegistroEmpleado(1L, "EMP-001", "Ana Torres",
                "Las Condes", "manana", 8.5, LocalDate.now());
        emp2 = new RegistroEmpleado(2L, "EMP-002", "Pedro Diaz",
                "Maipu", "tarde", 6.0, LocalDate.now());
    }

    // listarRegistros() devuelve ResponseEntity<List<RegistroEmpleado>>
    @Test
    void listarRegistros_retornaListaCompleta() {
        when(repo.findAll()).thenReturn(Arrays.asList(emp1, emp2));
        ResponseEntity<List<RegistroEmpleado>> response = controller.listarRegistros();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        verify(repo, times(1)).findAll();
    }

    @Test
    void listarRegistros_listaVacia_retornaListaVacia() {
        when(repo.findAll()).thenReturn(List.of());
        ResponseEntity<List<RegistroEmpleado>> response = controller.listarRegistros();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isEmpty());
    }

    @Test
    void recibirRegistro_payloadValido_guardaRegistro() {
        when(repo.save(any(RegistroEmpleado.class))).thenReturn(emp1);
        Map<String, Object> payload = new HashMap<>();
        payload.put("empleado_id",      "EMP-001");
        payload.put("nombre",           "Ana Torres");
        payload.put("sucursal",         "Las Condes");
        payload.put("turno",            "manana");
        payload.put("horas_trabajadas", 8.5);
        payload.put("fecha",            LocalDate.now().toString());

        ResponseEntity<?> response = controller.recibirRegistro(payload);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(repo, times(1)).save(any(RegistroEmpleado.class));
    }

    @Test
    void recibirRegistro_sinEmpleadoId_retorna400() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre",           "Ana Torres");
        payload.put("sucursal",         "Las Condes");
        payload.put("turno",            "manana");
        payload.put("horas_trabajadas", 8.5);
        // empleado_id falta

        ResponseEntity<?> response = controller.recibirRegistro(payload);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(repo, never()).save(any());
    }

    @Test
    void recibirRegistro_sinTurno_retorna400() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("empleado_id",      "EMP-001");
        payload.put("nombre",           "Ana Torres");
        payload.put("sucursal",         "Las Condes");
        payload.put("horas_trabajadas", 8.5);
        // turno falta

        ResponseEntity<?> response = controller.recibirRegistro(payload);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(repo, never()).save(any());
    }

    @Test
    void recibirRegistro_horasInvalidas_retorna400() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("empleado_id",      "EMP-001");
        payload.put("nombre",           "Ana Torres");
        payload.put("sucursal",         "Las Condes");
        payload.put("turno",            "manana");
        payload.put("horas_trabajadas", 25.0); // más de 24 horas

        ResponseEntity<?> response = controller.recibirRegistro(payload);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(repo, never()).save(any());
    }

    @Test
    void health_retornaUp() {
        // health() llama a repo.count() internamente — retorna 0L por defecto con Mockito
        ResponseEntity<Map<String, Object>> response = controller.health();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("UP", response.getBody().get("status"));
        assertEquals("ms4-empleados", response.getBody().get("service"));
    }
}
