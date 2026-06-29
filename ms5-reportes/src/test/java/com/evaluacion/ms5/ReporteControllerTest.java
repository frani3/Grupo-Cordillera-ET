package com.evaluacion.ms5;

import com.evaluacion.ms5.controller.ReporteController;
import com.evaluacion.ms5.model.EventoReporte;
import com.evaluacion.ms5.repository.ReporteRepository;
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
class ReporteControllerTest {

    @Mock
    private ReporteRepository repo;

    @InjectMocks
    private ReporteController controller;

    private EventoReporte ev1;
    private EventoReporte ev2;

    @BeforeEach
    void setUp() {
        ev1 = new EventoReporte(1L, "REP-001", "descuento",
                "Descuento promocional", 50000L, "Las Condes", LocalDate.now());
        ev2 = new EventoReporte(2L, "REP-002", "cierre-diario",
                "Cierre de caja", 1500000L, "Maipu", LocalDate.now());
    }

    // listarEventos() devuelve ResponseEntity<List<EventoReporte>>
    @Test
    void listarEventos_retornaListaCompleta() {
        when(repo.findAll()).thenReturn(Arrays.asList(ev1, ev2));
        ResponseEntity<List<EventoReporte>> response = controller.listarEventos();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        verify(repo, times(1)).findAll();
    }

    @Test
    void listarEventos_listaVacia_retornaListaVacia() {
        when(repo.findAll()).thenReturn(List.of());
        ResponseEntity<List<EventoReporte>> response = controller.listarEventos();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isEmpty());
    }

    @Test
    void recibirEvento_payloadValido_guardaEvento() {
        when(repo.save(any(EventoReporte.class))).thenReturn(ev1);
        Map<String, Object> payload = new HashMap<>();
        payload.put("reporte_id",  "REP-001");
        payload.put("tipo",        "descuento");
        payload.put("descripcion", "Descuento promocional");
        payload.put("monto",       50000L);
        payload.put("sucursal",    "Las Condes");
        payload.put("fecha",       LocalDate.now().toString());

        ResponseEntity<?> response = controller.recibirEvento(payload);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(repo, times(1)).save(any(EventoReporte.class));
    }

    @Test
    void recibirEvento_sinReporteId_retorna400() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("tipo",     "descuento");
        payload.put("sucursal", "Las Condes");
        payload.put("monto",    50000L);
        // reporte_id falta

        ResponseEntity<?> response = controller.recibirEvento(payload);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(repo, never()).save(any());
    }

    @Test
    void recibirEvento_sinTipo_retorna400() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("reporte_id", "REP-001");
        payload.put("sucursal",   "Las Condes");
        payload.put("monto",      50000L);
        // tipo falta

        ResponseEntity<?> response = controller.recibirEvento(payload);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(repo, never()).save(any());
    }

    @Test
    void recibirEvento_montoNegativo_retorna400() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("reporte_id", "REP-001");
        payload.put("tipo",       "descuento");
        payload.put("sucursal",   "Las Condes");
        payload.put("monto",      -1000L); // monto negativo

        ResponseEntity<?> response = controller.recibirEvento(payload);
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
        assertEquals("ms5-reportes", response.getBody().get("service"));
    }
}
