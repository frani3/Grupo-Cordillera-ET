package com.evaluacion.ms3;

import com.evaluacion.ms3.controller.InventarioController;
import com.evaluacion.ms3.model.ItemInventario;
import com.evaluacion.ms3.repository.InventarioRepository;
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
class InventarioControllerTest {

    @Mock
    private InventarioRepository repo;

    @InjectMocks
    private InventarioController controller;

    private ItemInventario item1;
    private ItemInventario item2;

    @BeforeEach
    void setUp() {
        item1 = new ItemInventario(1L, "ITEM-001", "electronica",
                "Laptop", 5, 899990L, "Las Condes", LocalDate.now());
        item2 = new ItemInventario(2L, "ITEM-002", "ropa",
                "Polera", 20, 14990L, "Maipu", LocalDate.now());
    }

    // listarItems() devuelve ResponseEntity<List<ItemInventario>>
    @Test
    void listarItems_retornaListaCompleta() {
        when(repo.findAll()).thenReturn(Arrays.asList(item1, item2));
        ResponseEntity<List<ItemInventario>> response = controller.listarItems();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        verify(repo, times(1)).findAll();
    }

    @Test
    void listarItems_listaVacia_retornaListaVacia() {
        when(repo.findAll()).thenReturn(List.of());
        ResponseEntity<List<ItemInventario>> response = controller.listarItems();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isEmpty());
    }

    @Test
    void recibirItem_payload_valido_guardaItem() {
        when(repo.save(any(ItemInventario.class))).thenReturn(item1);
        Map<String, Object> payload = new HashMap<>();
        payload.put("item_id",         "ITEM-001");
        payload.put("nombre",          "Laptop");
        payload.put("categoria",       "electronica");
        payload.put("cantidad",        5);
        payload.put("precio_unitario", 899990L);
        payload.put("sucursal",        "Las Condes");
        payload.put("fecha",           LocalDate.now().toString());

        ResponseEntity<?> response = controller.recibirItem(payload);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(repo, times(1)).save(any(ItemInventario.class));
    }

    @Test
    void recibirItem_sinItemId_retorna400() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre",          "Laptop");
        payload.put("sucursal",        "Las Condes");
        payload.put("cantidad",        5);
        payload.put("precio_unitario", 899990L);
        // item_id falta

        ResponseEntity<?> response = controller.recibirItem(payload);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(repo, never()).save(any());
    }

    @Test
    void recibirItem_sinNombre_retorna400() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("item_id",         "ITEM-001");
        payload.put("sucursal",        "Las Condes");
        payload.put("cantidad",        5);
        payload.put("precio_unitario", 899990L);
        // nombre falta

        ResponseEntity<?> response = controller.recibirItem(payload);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(repo, never()).save(any());
    }

    @Test
    void recibirItem_sinSucursal_retorna400() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("item_id",         "ITEM-001");
        payload.put("nombre",          "Laptop");
        payload.put("cantidad",        5);
        payload.put("precio_unitario", 899990L);
        // sucursal falta

        ResponseEntity<?> response = controller.recibirItem(payload);
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
        assertEquals("ms3-inventario", response.getBody().get("service"));
    }
}
